package com.albasave.albasave_server.lawapi.service;

import com.albasave.albasave_server.lawapi.dto.LawArticle;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 자주 사용되는 노동 관련 법령 조문 본문을 메모리에 캐시한다.
 * 위반 type → 법령/조문번호 매핑 후 본문을 조회해
 * LLM 응답 violations의 legalBasisExcerpt를 채우는 데 사용한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LegalContextService {

    private final LawApiClient lawApiClient;

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
}
