package com.albasave.albasave_server.payment.dto;

/**
 * 결제 기록 생성 요청 — 프론트 chargeMentorFee 성공 후 영속용.
 * menteeId 는 인증 토큰에서 추출하므로 본문에 없음.
 */
public record PaymentCreateRequest(
        String mentorId,
        String caseId,
        int amount
) {}
