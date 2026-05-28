package com.albasave.albasave_server.mentoring.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 매칭 결과 피드백 — Thompson Sampling 가중치 학습 데이터.
 *
 * - rating: 멘티 평점 (1~5)
 * - chatDays: 채팅 지속 일수 (활성도 지표)
 * - resolved: 사건 해결 여부 (자기보고)
 *
 * 종합 success 신호: rating >= 4 AND resolved
 */
@Entity
@Table(name = "matching_feedback",
        indexes = @Index(name = "ix_feedback_match", columnList = "match_id"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchingFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(nullable = false)
    private int rating;

    @Column(name = "chat_days")
    @Builder.Default
    private int chatDays = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean resolved = false;

    @Column(length = 1000)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Thompson Sampling 학습용 success 신호 */
    public boolean isSuccess() {
        return rating >= 4 && resolved;
    }
}
