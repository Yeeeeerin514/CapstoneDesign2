package com.albasave.albasave_server.report.dto;

import java.util.List;

/**
 * PUT /api/reports/{caseId}/evidence 요청 — 프론트 PutEvidenceRequest와 1:1.
 *
 * 멱등(같은 페이로드 반복 PUT 가능) & 부분 저장 허용:
 *  - 각 블록(damageTypes/freeFormDescription/respondent/facts)은 null 가능.
 *  - null인 블록은 서버가 기존 값을 유지한다.
 *
 * 진정인(본인) 정보는 포함되지 않으며, 서버는 저장하지 않는다.
 */
public record PutEvidenceRequest(
        List<String> damageTypes,        // 프론트 DamageTypeEnum 문자열 (BASE_WAGE 등)
        String freeFormDescription,
        RespondentDto respondent,
        FactsDto facts
) {
}
