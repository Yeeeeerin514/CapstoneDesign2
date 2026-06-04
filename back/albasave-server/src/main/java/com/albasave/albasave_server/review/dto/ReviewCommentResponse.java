package com.albasave.albasave_server.review.dto;

import com.albasave.albasave_server.review.domain.ReviewComment;

/**
 * Q&A 댓글 응답 — 프론트 QnaComment 와 동일한 JSON 형태.
 * record 컴포넌트명이 JSON 키로 직렬화됨(isAuthor 정확 보장).
 */
public record ReviewCommentResponse(
        String id,
        String authorNickname,
        boolean isAuthor,
        String body,
        String createdAt
) {
    public static ReviewCommentResponse from(ReviewComment c) {
        return new ReviewCommentResponse(
                String.valueOf(c.getId()),
                c.getAuthorNickname(),
                Boolean.TRUE.equals(c.getIsAuthor()),
                c.getBody(),
                c.getCreatedAt() != null ? c.getCreatedAt().toString() : null
        );
    }
}
