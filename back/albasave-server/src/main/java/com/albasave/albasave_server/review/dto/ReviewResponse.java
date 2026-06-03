package com.albasave.albasave_server.review.dto;

import com.albasave.albasave_server.review.domain.Review;

import java.util.Arrays;
import java.util.List;

/**
 * 후기 응답 — 프론트 ResolveReview 와 동일한 JSON 형태.
 * record 컴포넌트명이 JSON 키로 그대로 직렬화됨(isMentor 정확 보장).
 */
public record ReviewResponse(
        String id,
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
        int helpfulCount,
        boolean isMentor,
        String mentorUserId,
        String createdAt
) {
    public record Tips(String complaint, String investigation, String negotiation) {}

    public static ReviewResponse from(Review r) {
        return new ReviewResponse(
                String.valueOf(r.getId()),
                r.getAuthorNickname(),
                splitBadges(r.getAuthorBadges()),
                r.getIndustry(),
                r.getRegion(),
                r.getDamageType(),
                r.getResolutionMethod(),
                r.getUnpaidAmountRange(),
                r.getResolveDays() != null ? r.getResolveDays() : 0,
                r.getRating() != null ? r.getRating() : 0.0,
                r.getTitle(),
                r.getContent(),
                new Tips(nz(r.getTipComplaint()), nz(r.getTipInvestigation()), nz(r.getTipNegotiation())),
                r.getHelpfulCount() != null ? r.getHelpfulCount() : 0,
                Boolean.TRUE.equals(r.getIsMentor()),
                r.getMentorUserId(),
                r.getCreatedAt() != null ? r.getCreatedAt().toString() : null
        );
    }

    private static List<String> splitBadges(String joined) {
        if (joined == null || joined.isBlank()) return List.of();
        return Arrays.stream(joined.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
