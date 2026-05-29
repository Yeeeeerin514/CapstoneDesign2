package com.albasave.albasave_server.mentoring.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Thompson Sampling용 항목별 가중치.
 * 베타 분포 Beta(alpha, beta)로 모델링하여 피드백마다 업데이트.
 *
 * <ul>
 *   <li>매칭 시점: 분포에서 sample() → 항목별 가중치 결정</li>
 *   <li>피드백 시점: success=true → alpha++; success=false → beta++</li>
 * </ul>
 *
 * 콜드스타트 처리: 초기 alpha=beta=1 (= 균등 분포 Beta(1,1))로
 * 모든 항목에 동등한 기회를 줌. 데이터 쌓이면 자연스럽게 좋은 항목으로 수렴.
 */
@Entity
@Table(name = "matching_weight",
        indexes = @Index(name = "uk_weight_feature", columnList = "feature_name", unique = true))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchingWeight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 가중치 이름. GowerDistanceService의 항목명과 일치:
     * "damageTypes", "industry", "businessSize", "employmentType",
     * "damageAmountRange", "region", "resolutionMethods"
     */
    @Column(name = "feature_name", nullable = false, unique = true, length = 50)
    private String featureName;

    @Column(nullable = false)
    @Builder.Default
    private double alpha = 1.0;

    @Column(nullable = false)
    @Builder.Default
    private double beta = 1.0;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    /** Beta 분포의 기댓값 = α / (α + β) — UI/모니터링용 */
    public double expectedValue() {
        return alpha / (alpha + beta);
    }
}
