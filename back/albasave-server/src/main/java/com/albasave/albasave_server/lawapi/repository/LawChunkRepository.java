package com.albasave.albasave_server.lawapi.repository;

import com.albasave.albasave_server.lawapi.domain.LawChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * law_chunks 테이블 기본 CRUD.
 * pgvector 전용 검색/저장/DDL은 LawChunkVectorDao가 담당.
 */
public interface LawChunkRepository extends JpaRepository<LawChunk, Long> {

    long countByLawName(String lawName);

    boolean existsByLawNameAndArticleNumberAndPartNo(String lawName, String articleNumber, Integer partNo);

    @Query("SELECT DISTINCT c.lawName FROM LawChunk c")
    List<String> findDistinctLawNames();
}
