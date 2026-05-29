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
                name = "uk_law_chunks_source_external_part",
                columnNames = {"source_type", "external_id", "part_no"}
        ),
        indexes = {
                @Index(name = "ix_law_chunks_law", columnList = "law_name"),
                @Index(name = "ix_law_chunks_source", columnList = "source_type"),
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

    /**
     * 데이터 출처 유형.
     * - "LAW": 법령 조문 (기본)
     * - "PRECEDENT": 판례
     * - "INTERPRETATION": 법령해석례
     */
    @Column(name = "source_type", nullable = false, length = 30)
    @Builder.Default
    private String sourceType = "LAW";

    /**
     * 법령명 (LAW 청크) 또는 법원명/회신기관명 (PRECEDENT/INTERPRETATION).
     * UI에서 출처 표시에 사용.
     */
    @Column(name = "law_name", nullable = false, length = 200)
    private String lawName;

    /**
     * LAW: 조문 번호 (예: "55").
     * PRECEDENT: 판례일련번호.
     * INTERPRETATION: 법령해석례일련번호.
     * Unique 제약(source_type + external_id + part_no)에 함께 사용.
     */
    @Column(name = "article_number", length = 50)
    private String articleNumber;

    @Column(name = "article_title", length = 500)
    private String articleTitle;

    /** 같은 문서 내에서 쪼개진 순번 (0 = 본문 전체, 1~ = 항/구간) */
    @Column(name = "part_no", nullable = false)
    private Integer partNo;

    /** PRECEDENT/INTERPRETATION의 외부 식별자 (article_number와 같지만 명시적으로 보관) */
    @Column(name = "external_id", length = 50)
    private String externalId;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 임베딩 모델 식별자 (재계산/마이그레이션 용) */
    @Column(name = "embedding_model", length = 50)
    private String embeddingModel;
}
