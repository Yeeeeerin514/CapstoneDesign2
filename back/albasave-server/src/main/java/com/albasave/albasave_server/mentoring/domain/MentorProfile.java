package com.albasave.albasave_server.mentoring.domain;

import com.albasave.albasave_server.mentoring.domain.converter.DamageTypeListConverter;
import com.albasave.albasave_server.mentoring.domain.converter.ResolutionMethodListConverter;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "mentor_profile",
        indexes = {
                @Index(name = "ix_mentor_profile_user", columnList = "user_id", unique = true),
                @Index(name = "ix_mentor_profile_industry", columnList = "industry")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Industry industry;

    @Convert(converter = DamageTypeListConverter.class)
    @Column(name = "damage_types", length = 300)
    @Builder.Default
    private List<DamageType> damageTypes = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", length = 30)
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_size", length = 20)
    private BusinessSize businessSize;

    @Enumerated(EnumType.STRING)
    private Region region;

    @Convert(converter = ResolutionMethodListConverter.class)
    @Column(name = "resolution_methods", length = 200)
    @Builder.Default
    private List<ResolutionMethod> resolutionMethods = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_duration", length = 20)
    private ResolutionDurationRange resolutionDuration;

    @Enumerated(EnumType.STRING)
    @Column(name = "damage_amount_range", length = 20)
    private DamageAmountRange damageAmountRange;

    /** 멘토 자기소개 (자유 서술 200자) — Phase 2에서 임베딩 매칭 가능 */
    @Column(name = "bio", length = 500)
    private String bio;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private boolean isVerified = false;

    @Column(name = "average_rating")
    @Builder.Default
    private double averageRating = 0.0;

    @Column(name = "review_count")
    @Builder.Default
    private int reviewCount = 0;

    /** 동시에 받을 수 있는 멘티 수 (Gale-Shapley 캐파 제약) */
    @Column(name = "capacity")
    @Builder.Default
    private int capacity = 3;

    /** 현재 ACTIVE 매칭 수 — Gale-Shapley 매칭 시점에 검증 */
    @Column(name = "current_mentee_count")
    @Builder.Default
    private int currentMenteeCount = 0;

    @Column(name = "consulting_fee")
    @Builder.Default
    private int consultingFee = 10000;

    // ─────────────────────────────────────────────────────────────────
    //  자격 검증 (모든 사용자가 멘토가 될 수 없음 — 자격 보유자만)
    // ─────────────────────────────────────────────────────────────────

    /**
     * 검증 방식. null이면 미검증 — 매칭에서 제외됨.
     * RESOLVED_CASE: 앱 내 신고 해결 경험 보유
     * EVIDENCE_UPLOAD: 외부 증빙 자료 업로드
     * ADMIN_VERIFIED: 관리자 수동 승인
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_method", length = 30)
    private VerificationMethod verificationMethod;

    /**
     * 자격 부여 근거 사건 ID들 (JSON 배열 문자열). RESOLVED_CASE인 경우 필수.
     * 예: "[12, 47, 89]"
     */
    @Column(name = "verified_case_ids", length = 500)
    private String verifiedCaseIdsJson;

    /**
     * 증빙 자료 S3 URL들 (JSON 배열 문자열). EVIDENCE_UPLOAD인 경우 필수.
     */
    @Column(name = "evidence_urls", columnDefinition = "TEXT")
    private String evidenceUrlsJson;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
