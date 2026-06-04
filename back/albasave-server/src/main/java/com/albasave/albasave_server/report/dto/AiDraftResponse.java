package com.albasave.albasave_server.report.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * POST /api/reports/{caseId}/complaint-draft 응답.
 * 필드명은 프론트가 읽는 키(data.complaintDraft)와 1:1.
 */
@Getter
@AllArgsConstructor
public class AiDraftResponse {
    private String complaintDraft;   // Gemini가 생성한 진정 내용 본문
}
