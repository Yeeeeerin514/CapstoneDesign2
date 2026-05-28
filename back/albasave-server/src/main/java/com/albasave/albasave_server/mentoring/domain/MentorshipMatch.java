package com.albasave.albasave_server.mentoring.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "mentorship_match",
        indexes = {
                @Index(name = "ix_match_mentee", columnList = "mentee_user_id"),
                @Index(name = "ix_match_mentor", columnList = "mentor_profile_id"),
                @Index(name = "ix_match_case", columnList = "case_id"),
                @Index(name = "ix_match_status", columnList = "status")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorshipMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false)
    private Long requestId;

    @Column(name = "mentor_profile_id", nullable = false)
    private Long mentorProfileId;

    @Column(name = "mentee_user_id", nullable = false)
    private Long menteeUserId;

    @Column(name = "case_id")
    private Long caseId;

    /**
     * 최종 매칭 점수 (0~1). 클수록 매칭 잘 됨.
     * matchScore = 1 - normalizedDistance
     */
    @Column(name = "match_score", nullable = false)
    private double matchScore;

    /** Gower 거리 기반 점수 (0~1) */
    @Column(name = "rule_based_score")
    private Double ruleBasedScore;

    /** Phase 2: Two-tower 신경망 점수 (0~1). Phase 1에선 null */
    @Column(name = "neural_score")
    private Double neuralScore;

    /**
     * 항목별 기여도 JSON (SHAP-style).
     * 예: {"damageTypes": 0.35, "industry": 0.28, "businessSize": 0.20, ...}
     */
    @Column(name = "feature_contributions", columnDefinition = "TEXT")
    private String featureContributionsJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MatchStatus status = MatchStatus.PROPOSED;

    @Column(name = "rank_in_recommendation")
    private Integer rankInRecommendation;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "matched_at")
    private LocalDateTime matchedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
