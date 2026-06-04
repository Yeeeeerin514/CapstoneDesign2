package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.CaseStep;
import com.albasave.albasave_server.report.domain.Report;
import com.albasave.albasave_server.report.domain.ReportStatus;
import com.albasave.albasave_server.report.domain.damageTypeCode;

import java.time.LocalDateTime;
import java.util.List;

/**
 * GET /api/reports 응답 — 목록용 요약.
 * 리스트 카드에 필요한 최소 정보만 담는다(상세는 단건 조회로).
 */
public record ReportSummaryResponse(
        Long caseId,
        ReportStatus status,
        CaseStep currentStep,
        LocalDateTime createdAt,
        String workplaceName,
        List<String> damageTypes,
        Integer totalUnpaidWage
) {
    public static ReportSummaryResponse from(Report report) {
        String workplaceName = (report.getBusiness() != null)
                ? report.getBusiness().getName() : null;
        Integer totalUnpaidWage = (report.getFacts() != null)
                ? report.getFacts().getTotalUnpaidWage() : null;
        List<String> damageTypes = report.getDamageTypes().stream()
                .map(damageTypeCode::getFrontendKey)
                .toList();
        return new ReportSummaryResponse(
                report.getId(),
                report.getStatus(),
                report.getCurrentStep(),
                report.getCreatedAt(),
                workplaceName,
                damageTypes,
                totalUnpaidWage);
    }
}
