package com.albasave.albasave_server.lawapi.repository;

import com.albasave.albasave_server.lawapi.dto.LawChunkMatch;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * pgvector 전용 네이티브 SQL.
 * - embedding 컬럼은 JPA 표준 매핑이 불가하므로 별도 처리.
 * - ivfflat 인덱스 보강도 여기서 담당.
 */
@Slf4j
@Repository
public class LawChunkVectorDao {

    @PersistenceContext
    private EntityManager em;

    /** 임베딩 저장. embedding은 "[v1,v2,...]" 형식 문자열로 캐스팅. */
    @Transactional
    public void saveEmbedding(Long chunkId, String embeddingLiteral) {
        em.createNativeQuery(
                "UPDATE law_chunks SET embedding = CAST(:emb AS vector) WHERE id = :id"
        )
        .setParameter("emb", embeddingLiteral)
        .setParameter("id", chunkId)
        .executeUpdate();
    }

    /** 모든 source_type 통합 검색. */
    public List<LawChunkMatch> searchSimilar(String embeddingLiteral, int topK) {
        return searchSimilarByTypes(embeddingLiteral, topK, null);
    }

    /**
     * sourceType 필터 옵션 추가 검색.
     * @param sourceTypes  null이면 전체. 예: List.of("LAW") 또는 List.of("PRECEDENT", "INTERPRETATION")
     */
    @SuppressWarnings("unchecked")
    public List<LawChunkMatch> searchSimilarByTypes(String embeddingLiteral, int topK, List<String> sourceTypes) {
        String sql = """
                SELECT id, source_type, law_name, article_number, article_title, part_no, content,
                       embedding <=> CAST(:emb AS vector) AS distance
                FROM law_chunks
                WHERE embedding IS NOT NULL
                """ +
                (sourceTypes == null || sourceTypes.isEmpty() ? "" : " AND source_type IN (:types) ") +
                """
                ORDER BY embedding <=> CAST(:emb AS vector)
                LIMIT :k
                """;
        var query = em.createNativeQuery(sql)
                .setParameter("emb", embeddingLiteral)
                .setParameter("k", topK);
        if (sourceTypes != null && !sourceTypes.isEmpty()) {
            query.setParameter("types", sourceTypes);
        }
        List<Object[]> rows = query.getResultList();
        return rows.stream().map(r -> new LawChunkMatch(
                ((Number) r[0]).longValue(),
                (String) r[1],
                (String) r[2],
                (String) r[3],
                (String) r[4],
                r[5] == null ? null : ((Number) r[5]).intValue(),
                (String) r[6],
                ((Number) r[7]).doubleValue()
        )).toList();
    }

    /**
     * 스키마 보강: embedding 컬럼 + ivfflat 인덱스가 없으면 추가.
     * JPA ddl-auto가 못 만드는 pgvector 전용 DDL을 보강.
     */
    @Transactional
    public void ensureVectorColumnAndIndex(int dimensions) {
        em.createNativeQuery(
                "ALTER TABLE law_chunks ADD COLUMN IF NOT EXISTS embedding vector(" + dimensions + ")"
        ).executeUpdate();
        em.createNativeQuery(
                """
                CREATE INDEX IF NOT EXISTS ix_law_chunks_embedding
                ON law_chunks USING hnsw (embedding vector_cosine_ops)
                """
        ).executeUpdate();
        log.info("[LawChunkVectorDao] embedding({}) 컬럼 + hnsw 인덱스 보강 완료", dimensions);
    }

    /** 임베딩이 비어있는 청크 ID 목록 (적재 배치에서 미완료분만 보충용) */
    @SuppressWarnings("unchecked")
    public List<Long> findIdsWithoutEmbedding() {
        return em.createNativeQuery(
                "SELECT id FROM law_chunks WHERE embedding IS NULL ORDER BY id"
        ).getResultList()
        .stream()
        .map(o -> ((Number) o).longValue())
        .toList();
    }
}
