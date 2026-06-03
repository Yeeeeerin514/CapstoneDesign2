package com.albasave.albasave_server.review.dto;

import java.util.List;

/**
 * 후기 작성 요청 — 프론트 addReview 입력(Omit<ResolveReview,"id"|"createdAt"|"helpfulCount">)과 대응.
 */
public record ReviewCreateRequest(
        String authorNickname,
        List<String> authorBadges,
        String industry,
        String region,
        String damageType,
        String resolutionMethod,
        String unpaidAmountRange,
        int resolveDays,
        double rating,
        String title,
        String content,
        Tips tips,
        boolean isMentor,
        String mentorUserId
) {
    public record Tips(String complaint, String investigation, String negotiation) {}
}
