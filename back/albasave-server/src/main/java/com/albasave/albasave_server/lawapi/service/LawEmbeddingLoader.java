package com.albasave.albasave_server.lawapi.service;

import com.albasave.albasave_server.lawapi.domain.LawChunk;
import com.albasave.albasave_server.lawapi.dto.LawArticle;
import com.albasave.albasave_server.lawapi.dto.LawDocument;
import com.albasave.albasave_server.lawapi.repository.LawChunkRepository;
import com.albasave.albasave_server.lawapi.repository.LawChunkVectorDao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 앱 시작 시 법령 조문을 청크로 분할하여 임베딩과 함께 DB에 적재.
 *
 * - 이미 적재된 조문은 건너뜀 (idempotent).
 * - pgvector 스키마 보강(컬럼 + ivfflat 인덱스)도 책임짐.
 * - 임베딩 실패해도 앱 기동은 막지 않음(서비스는 폴백 매핑 유지).
 *
 * @Order로 LegalContextService.preload()보다 먼저 실행되도록 설정 (메모리 캐시도 함께 채워야 하므로).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Order(0)
public class LawEmbeddingLoader {

    private static final List<String> LAWS_TO_LOAD = List.of(
            "근로기준법",
            "최저임금법",
            "근로자퇴직급여 보장법"
    );

    /**
     * Level 3: 판례 / 법령해석례 적재용 키워드.
     * 노동 관련 핵심 주제어로 검색하여 결과를 합산.
     */
    private static final List<String> LABOR_QUERIES = List.of(
            "주휴수당",
            "임금체불",
            "연장근로 가산수당",
            "휴게시간",
            "최저임금",
            "연차유급휴가",
            "퇴직금",
            "근로계약서",
            "통상임금",
            "포괄임금"
    );
    private static final int DOCS_PER_QUERY = 5;

    private final LawApiClient lawApiClient;
    private final LawChunkingService chunkingService;
    private final LawChunkRepository chunkRepository;
    private final LawChunkVectorDao vectorDao;
    private final OpenAiEmbeddingClient embeddingClient;

    @EventListener(ApplicationReadyEvent.class)
    public void run() {
        try {
            vectorDao.ensureVectorColumnAndIndex(OpenAiEmbeddingClient.DIMENSIONS);
        } catch (Exception e) {
            log.error("[LawEmbeddingLoader] pgvector 스키마 보강 실패 — 적재 건너뜀: {}", e.getMessage());
            return;
        }

        for (String lawName : LAWS_TO_LOAD) {
            try {
                loadOneLaw(lawName);
            } catch (Exception e) {
                log.error("[LawEmbeddingLoader] {} 적재 실패: {}", lawName, e.getMessage());
            }
        }

        // Level 3: 판례·해석례 적재
        try {
            loadDocuments();
        } catch (Exception e) {
            log.error("[LawEmbeddingLoader] 판례·해석례 적재 실패: {}", e.getMessage());
        }

        log.info("[LawEmbeddingLoader] 모든 법령 적재 시도 완료");
    }

    /**
     * 키워드별 판례·해석례를 검색하여 청크 분할 + 임베딩 적재.
     * 같은 문서가 여러 키워드에 잡힐 수 있으므로 externalId 중복 체크.
     */
    public void loadDocuments() {
        long existingPrec = chunkRepository.countBySourceType("PRECEDENT");
        long existingInterp = chunkRepository.countBySourceType("INTERPRETATION");
        if (existingPrec > 0 || existingInterp > 0) {
            log.info("[LawEmbeddingLoader] 판례 {}개 / 해석례 {}개 청크 이미 존재 — 건너뜀",
                    existingPrec, existingInterp);
            return;
        }

        java.util.Set<String> seenPrec = new java.util.HashSet<>();
        java.util.Set<String> seenInterp = new java.util.HashSet<>();

        for (String q : LABOR_QUERIES) {
            try {
                for (LawDocument doc : lawApiClient.fetchPrecedents(q, DOCS_PER_QUERY)) {
                    if (seenPrec.add(doc.externalId())) {
                        loadOneDocument(doc);
                    }
                }
            } catch (Exception e) {
                log.warn("[LawEmbeddingLoader] 판례 '{}' 적재 실패: {}", q, e.getMessage());
            }
            try {
                for (LawDocument doc : lawApiClient.fetchInterpretations(q, DOCS_PER_QUERY)) {
                    if (seenInterp.add(doc.externalId())) {
                        loadOneDocument(doc);
                    }
                }
            } catch (Exception e) {
                log.warn("[LawEmbeddingLoader] 해석례 '{}' 적재 실패: {}", q, e.getMessage());
            }
        }
        log.info("[LawEmbeddingLoader] 판례 {}건 / 해석례 {}건 적재 완료", seenPrec.size(), seenInterp.size());
    }

    @org.springframework.transaction.annotation.Transactional
    public void loadOneDocument(LawDocument doc) {
        List<LawChunkingService.Chunk> chunks = chunkingService.chunkDocument(doc);
        if (chunks.isEmpty()) return;

        List<LawChunk> savedChunks = new java.util.ArrayList<>();
        List<String> texts = new java.util.ArrayList<>();
        for (LawChunkingService.Chunk c : chunks) {
            if (chunkRepository.existsBySourceTypeAndExternalIdAndPartNo(
                    doc.sourceType(), doc.externalId(), c.partNo())) {
                continue;
            }
            LawChunk entity = LawChunk.builder()
                    .sourceType(doc.sourceType())
                    .lawName(doc.issuer() == null ? doc.sourceType() : doc.issuer())
                    .articleNumber(doc.externalId())  // 외부 ID를 article_number에도 동일하게 (호환)
                    .articleTitle(doc.title())
                    .externalId(doc.externalId())
                    .partNo(c.partNo())
                    .content(c.content())
                    .embeddingModel("text-embedding-3-small")
                    .build();
            savedChunks.add(chunkRepository.save(entity));
            texts.add(c.content());
        }
        if (savedChunks.isEmpty()) return;

        List<float[]> vectors = embeddingClient.embedBatch(texts);
        if (vectors.size() != savedChunks.size()) {
            log.warn("[LawEmbeddingLoader] {} {} 임베딩 수 불일치 (chunks={}, vectors={})",
                    doc.sourceType(), doc.externalId(), savedChunks.size(), vectors.size());
            return;
        }
        for (int i = 0; i < savedChunks.size(); i++) {
            vectorDao.saveEmbedding(
                    savedChunks.get(i).getId(),
                    OpenAiEmbeddingClient.toVectorLiteral(vectors.get(i))
            );
        }
    }

    @Transactional
    public void loadOneLaw(String lawName) {
        long existing = chunkRepository.countByLawName(lawName);
        if (existing > 0) {
            log.info("[LawEmbeddingLoader] {} 이미 {}개 청크 존재 — 건너뜀", lawName, existing);
            return;
        }

        List<LawArticle> articles = lawApiClient.fetchLaw(lawName);
        if (articles.isEmpty()) {
            log.warn("[LawEmbeddingLoader] {} 조문 0건 — API 호출 실패 가능성", lawName);
            return;
        }

        List<LawChunk> savedChunks = new ArrayList<>();
        List<String> texts = new ArrayList<>();

        for (LawArticle article : articles) {
            List<LawChunkingService.Chunk> chunks = chunkingService.chunk(article);
            for (LawChunkingService.Chunk c : chunks) {
                if (chunkRepository.existsByLawNameAndArticleNumberAndPartNo(
                        lawName, article.articleNumber(), c.partNo())) {
                    continue;
                }
                LawChunk entity = LawChunk.builder()
                        .lawName(lawName)
                        .articleNumber(article.articleNumber())
                        .articleTitle(article.articleTitle())
                        .partNo(c.partNo())
                        .content(c.content())
                        .embeddingModel("text-embedding-3-small")
                        .build();
                savedChunks.add(chunkRepository.save(entity));
                texts.add(c.content());
            }
        }

        if (savedChunks.isEmpty()) {
            log.info("[LawEmbeddingLoader] {} 신규 청크 없음", lawName);
            return;
        }

        log.info("[LawEmbeddingLoader] {} 청크 {}개 저장 — 임베딩 생성 시작", lawName, savedChunks.size());

        List<float[]> vectors = embeddingClient.embedBatch(texts);
        if (vectors.size() != savedChunks.size()) {
            log.error("[LawEmbeddingLoader] {} 임베딩 수 불일치 (chunks={}, vectors={}) — 적재 중단",
                    lawName, savedChunks.size(), vectors.size());
            return;
        }

        for (int i = 0; i < savedChunks.size(); i++) {
            vectorDao.saveEmbedding(
                    savedChunks.get(i).getId(),
                    OpenAiEmbeddingClient.toVectorLiteral(vectors.get(i))
            );
        }

        log.info("[LawEmbeddingLoader] {} 청크 {}개 임베딩 저장 완료", lawName, savedChunks.size());
    }
}
