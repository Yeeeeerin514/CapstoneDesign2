package com.albasave.albasave_server.lawapi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 법령 조문을 의미 단위로 쪼갠 청크.
 * pgvector의 embedding 컬럼은 JPA 표준으로 매핑 불가하므로
 * DDL은 별도 SQL로 보강 (LawChunkSchemaInitializer 참고).
 *
 * 이 엔티티 자체는 임베딩 컬럼을 들고 다니지 않고,
 * 검색/적재는 네이티브 쿼리(LawChunkRepository.searchSimilar / saveChunk)로 처리한다.
 */
@Entity
@Table(
        name = "law_chunks",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_law_chunks_law_article_part",
                columnNames = {"law_name", "article_number", "part_no"}
        ),
        indexes = {
                @Index(name = "ix_law_chunks_law", columnList = "law_name"),
                @Index(name = "ix_law_chunks_article", columnList = "law_name, article_number")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class LawChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "law_name", nullable = false, length = 100)
    private String lawName;

    @Column(name = "article_number", nullable = false, length = 20)
    private String articleNumber;

    @Column(name = "article_title", length = 200)
    private String articleTitle;

    /** 같은 조문 내에서 항/호로 쪼개진 순번 (0 = 본문 전체, 1~ = 항 단위) */
    @Column(name = "part_no", nullable = false)
    private Integer partNo;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 임베딩 모델 식별자 (재계산/마이그레이션 용) */
    @Column(name = "embedding_model", length = 50)
    private String embeddingModel;
}
