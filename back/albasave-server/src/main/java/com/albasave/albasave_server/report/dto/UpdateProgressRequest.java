package com.albasave.albasave_server.report.dto;

/**
 * PATCH /api/reports/{caseId}/progress 요청.
 * 프론트 화면 전환(노동청 제출 확인·해결 확인 등)을 서버 진행 상태에 동기화한다.
 * 두 필드 모두 선택 — null이면 해당 항목은 변경하지 않는다.
 *
 * step: CaseStep lower_snake 표기 (예: "investigation") — 역행 요청은 무시.
 * status: ReportStatus 상수명 (예: "INSPECTING") — 정의된 전이만 적용.
 */
public record UpdateProgressRequest(
        String step,
        String status
) {
}
