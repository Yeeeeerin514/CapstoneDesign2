package com.albasave.albasave_server.payment.dto;

import com.albasave.albasave_server.payment.domain.Payment;

/**
 * 결제 응답 — 프론트 PaymentRecord 와 동일 형태.
 */
public record PaymentResponse(
        String id,
        String menteeId,
        String mentorId,
        String caseId,
        int amount,
        String status,
        String createdAt,
        String refundedAt
) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(
                String.valueOf(p.getId()),
                p.getMenteeUserId() != null ? String.valueOf(p.getMenteeUserId()) : null,
                p.getMentorId(),
                p.getCaseId(),
                p.getAmount() != null ? p.getAmount() : 0,
                p.getStatus(),
                p.getCreatedAt() != null ? p.getCreatedAt().toString() : null,
                p.getRefundedAt() != null ? p.getRefundedAt().toString() : null
        );
    }
}
