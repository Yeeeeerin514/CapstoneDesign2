package com.albasave.albasave_server.report.dto;

/**
 * POST /api/reports/{caseId}/complaint-draft 요청 본문(선택).
 *
 * 프론트의 "사업주와 협의 시도하셨나요?" 선택값을 전달한다.
 * 허용 값: "refused" | "not-tried" | "no-response" (그 외/누락 시 협의 정황은 미반영).
 * 프론트가 보여주는 안내 문구 자체가 아니라 '선택 키'만 보내며,
 * 서버가 이를 사실 서술로 변환해 AI가 격식체로 다시 풀어 쓰게 한다.
 */
public record GenerateComplaintDraftRequest(String negotiationStatus) {
}
