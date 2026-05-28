package com.albasave.albasave_server.lawapi.service;

import com.albasave.albasave_server.lawapi.dto.LawArticle;
import com.albasave.albasave_server.lawapi.dto.LawChunkMatch;
import com.albasave.albasave_server.lawapi.repository.LawChunkVectorDao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 노동 법령 조문 컨텍스트 제공.
 *
 * - 폴백(Level 0): 위반 type → 고정 조문번호 매핑 + 메모리 캐시. 임베딩 미적재 시에도 동작.
 * - 신규(Level 1): pgvector 의미 검색. 자유 텍스트로 top-K 관련 조문 발췌.
 */
@Slf4j
@Service
@Order(10)
@RequiredArgsConstructor
public class LegalContextService {

    private final LawApiClient lawApiClient;
    private final OpenAiEmbeddingClient embeddingClient;
    private final LawChunkVectorDao vectorDao;

    /** Map<법령명, Map<조문번호, LawArticle>> */
    private final Map<String, Map<String, LawArticle>> cache = new HashMap<>();

    /** 위반 type → (법령명, 조문번호) 매핑 */
    private static final Map<String, String[]> VIOLATION_TO_ARTICLE = Map.of(
            "MINIMUM_WAGE", new String[]{"최저임금법", "6"},
            "OVERTIME_PAY", new String[]{"근로기준법", "56"},
            "WEEKLY_HOLIDAY", new String[]{"근로기준법", "55"},
            "ANNUAL_LEAVE", new String[]{"근로기준법", "60"},
            "REST_TIME", new String[]{"근로기준법", "54"},
            "MANDATORY_ITEMS", new String[]{"근로기준법", "17"},
            "WORKING_HOURS", new String[]{"근로기준법", "50"}
    );

    private static final List<String> LAWS_TO_PRELOAD = List.of(
            "근로기준법",
            "최저임금법",
            "근로자퇴직급여 보장법"
    );

    @EventListener(ApplicationReadyEvent.class)
    public void preload() {
        for (String lawName : LAWS_TO_PRELOAD) {
            List<LawArticle> articles = lawApiClient.fetchLaw(lawName);
            if (articles.isEmpty()) continue;
            Map<String, LawArticle> byNumber = new HashMap<>();
            for (LawArticle a : articles) {
                byNumber.put(a.articleNumber(), a);
            }
            cache.put(lawName, byNumber);
        }
        log.info("[LegalContext] 법령 {}개 캐시 완료", cache.size());
    }

    /** 위반 type에 해당하는 조문 본문 발췌. 없으면 Optional.empty. */
    public Optional<LawArticle> findArticleForViolation(String violationType) {
        if (violationType == null) return Optional.empty();
        String[] mapping = VIOLATION_TO_ARTICLE.get(violationType);
        if (mapping == null) return Optional.empty();
        return findArticle(mapping[0], mapping[1]);
    }

    public Optional<LawArticle> findArticle(String lawName, String articleNumber) {
        Map<String, LawArticle> byNumber = cache.get(lawName);
        if (byNumber == null) return Optional.empty();
        LawArticle a = byNumber.get(articleNumber);
        return Optional.ofNullable(a);
    }

    public boolean isReady() {
        return !cache.isEmpty();
    }

    // ─────────────────────────────────────────────────────────────────
    //  Level 1 RAG: 의미 기반 조문 검색
    // ─────────────────────────────────────────────────────────────────

    /**
     * 자유 텍스트로 관련 조문을 의미 기반 검색.
     * 임베딩이 적재되지 않았거나 OpenAI 호출 실패 시 빈 리스트 반환 — 호출 측은 폴백을 준비할 것.
     *
     * @param query     계약서 위반 description, 추출된 조항 등 자유 텍스트
     * @param topK      반환할 최대 개수 (보통 3~5)
     * @return distance 오름차순으로 정렬된 매치 리스트
     */
    public List<LawChunkMatch> searchSimilar(String query, int topK) {
        return searchSimilarByTypes(query, topK, null);
    }

    /**
     * sourceType 필터 의미 검색.
     * @param sourceTypes  null이면 전체. List.of("LAW") / List.of("PRECEDENT","INTERPRETATION") 등.
     */
    public List<LawChunkMatch> searchSimilarByTypes(String query, int topK, List<String> sourceTypes) {
        if (query == null || query.isBlank()) return List.of();
        try {
            float[] vec = embeddingClient.embed(query);
            if (vec == null) return List.of();
            return vectorDao.searchSimilarByTypes(
                    OpenAiEmbeddingClient.toVectorLiteral(vec), topK, sourceTypes);
        } catch (Exception e) {
            log.warn("[LegalContext] 의미 검색 실패 — 빈 결과 반환: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * 위반 type 기반 폴백 + 의미 검색 결합.
     * 1) violation type 매핑으로 1차 후보 확보 (기존 Level 0)
     * 2) description으로 의미 검색해서 보강
     * 결과는 중복 제거 후 최대 topK개 반환.
     */
    public List<LawChunkMatch> findArticlesForViolation(String violationType, String description, int topK) {
        List<LawChunkMatch> matches = new java.util.ArrayList<>();

        // 의미 검색이 가능하면 우선 활용
        if (description != null && !description.isBlank()) {
            matches.addAll(searchSimilar(description, topK));
        }

        // 폴백: 기존 매핑에서도 1건 가져와 보강
        findArticleForViolation(violationType).ifPresent(a -> {
            boolean alreadyIncluded = matches.stream().anyMatch(
                    m -> m.lawName().equals(a.lawName()) && m.articleNumber().equals(a.articleNumber())
            );
            if (!alreadyIncluded) {
                matches.add(new LawChunkMatch(
                        -1L, "LAW", a.lawName(), a.articleNumber(), a.articleTitle(), 0,
                        a.body(), 1.0
                ));
            }
        });

        return matches.size() > topK ? matches.subList(0, topK) : matches;
    }
}
