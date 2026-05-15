package com.albasave.albasave_server.report.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "analysis_log", indexes = {
        @Index(name = "idx_analysis_log_business_id", columnList = "business_id"),
        @Index(name = "idx_analysis_log_user_id", columnList = "user_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 사업자등록번호 (피해 사업장) */
    @Column(name = "business_registration_number")
    private String businessRegistrationNumber;

    @Column(name = "business_id")
    private Long businessId;

    @Column(name = "business_name")
    private String businessName;

    @Column(name = "part_time_job_id")
    private Long partTimeJobId;

    /** 체불 유형: MINIMUM_WAGE / WEEKLY_HOLIDAY / OVERTIME / NIGHT / OTHER */
    @Column(name = "violation_type")
    private String violationType;

    /** 체불 금액 (원) */
    @Column(name = "unpaid_amount")
    private Long unpaidAmount;

    /** 피해 설명 (자연어 입력 또는 AI 분석 결과) */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** AI 분석 결과 JSON (체불 유형 분류, 증거 추출 등) */
    @Column(name = "ai_analysis_json", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.JSON)
    private String aiAnalysisJson;

    /** 업로드된 증거 이미지 URL (S3) */
    @Column(name = "evidence_image_url")
    private String evidenceImageUrl;

    /** 진정서 초안 텍스트 */
    @Column(name = "complaint_draft", columnDefinition = "TEXT")
    private String complaintDraft;

    /** 진정서 PDF URL (S3) */
    @Column(name = "complaint_pdf_url")
    private String complaintPdfUrl;

    /** 신고 상태: DRAFT / SUBMITTED / MATCHED (공동대응 매칭됨) */
    @Column(name = "status")
    @Builder.Default
    private String status = "DRAFT";

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
