package com.albasave.albasave_server.review.dto;

/**
 * Q&A 댓글 작성 요청.
 * 작성자/작성자 본인 여부는 서버가 JWT(userId)로 판별하므로, 클라이언트는 본문만 보낸다.
 */
public record ReviewCommentCreateRequest(
        String body
) {}
