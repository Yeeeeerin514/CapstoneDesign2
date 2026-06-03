package com.albasave.albasave_server.review.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 해결 후기 (임금체불 사건을 해결한 사용자가 남기는 노하우 공유).
 * 프론트 entities/review 의 ResolveReview 모델과 1:1 대응.
 */
@Entity
@Table(name = "resolve_review")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 작성자 user.id */
    private Long authorUserId;

    private String authorNickname;

    /** 배지 목록 — 쉼표(,)로 join 저장. 예: "🛡 인증멘토,⚡ 빠른해결" */
    @Column(length = 500)
    private String authorBadges;

    private String industry;
    private String region;
    private String damageType;
    private String resolutionMethod;
    private String unpaidAmountRange;

    private Integer resolveDays;
    private Double rating;

    private String title;

    @Column(length = 2000)
    private String content;

    @Column(length = 1000)
    private String tipComplaint;
    @Column(length = 1000)
    private String tipInvestigation;
    @Column(length = 1000)
    private String tipNegotiation;

    private Integer helpfulCount;

    private Boolean isMentor;
    /** 멘토 등록 시 멘토 user.id (문자열). 미등록이면 null */
    private String mentorUserId;

    private LocalDateTime createdAt;
}
