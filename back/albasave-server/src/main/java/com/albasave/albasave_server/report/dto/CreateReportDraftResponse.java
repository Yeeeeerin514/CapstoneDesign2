package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.BusinessSnapshot;
import com.albasave.albasave_server.report.domain.CaseStep;
import com.albasave.albasave_server.report.domain.Report;
import com.albasave.albasave_server.report.domain.ReportStatus;

import java.time.LocalDateTime;

/**
 * POST /api/reports/draft 응답 — 프론트 CreateReportDraftResponse와 1:1.
 * business 블록은 BusinessSnapshot이 그대로 직렬화된다(필드명이 BusinessInfo와 동일).
 */
public record CreateReportDraftResponse(
        Long caseId,
        ReportStatus status,
        CaseStep currentStep,
        LocalDateTime createdAt,
        BusinessSnapshot business
) {
    public static CreateReportDraftResponse from(Report report) {
        return new CreateReportDraftResponse(
                report.getId(),
                report.getStatus(),
                report.getCurrentStep(),
                report.getCreatedAt(),
                report.getBusiness()
        );
    }
}
