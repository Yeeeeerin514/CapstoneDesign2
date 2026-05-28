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

    /** cosine distance 기준 top-K 검색. 결과는 거리 오름차순. */
    @SuppressWarnings("unchecked")
    public List<LawChunkMatch> searchSimilar(String embeddingLiteral, int topK) {
        List<Object[]> rows = em.createNativeQuery(
                """
                SELECT id, law_name, article_number, article_title, part_no, content,
                       embedding <=> CAST(:emb AS vector) AS distance
                FROM law_chunks
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> CAST(:emb AS vector)
                LIMIT :k
                """
        )
        .setParameter("emb", embeddingLiteral)
        .setParameter("k", topK)
        .getResultList();

        return rows.stream().map(r -> new LawChunkMatch(
                ((Number) r[0]).longValue(),
                (String) r[1],
                (String) r[2],
                (String) r[3],
                r[4] == null ? null : ((Number) r[4]).intValue(),
                (String) r[5],
                ((Number) r[6]).doubleValue()
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
