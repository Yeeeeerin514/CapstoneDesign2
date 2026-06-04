package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.BusinessSnapshot;
import com.albasave.albasave_server.report.domain.CaseStep;
import com.albasave.albasave_server.report.domain.ComplaintFacts;
import com.albasave.albasave_server.report.domain.Report;
import com.albasave.albasave_server.report.domain.ReportSource;
import com.albasave.albasave_server.report.domain.ReportStatus;
import com.albasave.albasave_server.report.domain.RespondentInfo;
import com.albasave.albasave_server.report.domain.damageTypeCode;

import java.time.LocalDateTime;
import java.util.List;

/**
 * GET /api/reports/{caseId} 응답 — 단건 상세.
 *
 * 저장된 draft + evidence를 프론트 V2 타입에 맞춰 그대로 돌려준다.
 *  - business / respondent / facts: 임베디드 필드명이 프론트 BusinessInfo·ComplaintRespondent·
 *    ComplaintFacts와 1:1이라 그대로 직렬화된다.
 *  - damageTypes: 저장된 enum을 프론트 DamageTypeEnum 문자열로 환원.
 *  - 진정인(본인) 정보는 애초에 저장하지 않으므로 포함되지 않는다.
 */
public record ReportDetailResponse(
        Long caseId,
        ReportSource source,
        ReportStatus status,
        CaseStep currentStep,
        LocalDateTime createdAt,
        BusinessSnapshot business,
        List<String> damageTypes,
        String freeFormDescription,
        RespondentInfo respondent,
        ComplaintFacts facts
) {
    public static ReportDetailResponse from(Report report) {
        List<String> damageTypes = report.getDamageTypes().stream()
                .map(damageTypeCode::getFrontendKey)
                .toList();
        return new ReportDetailResponse(
                report.getId(),
                report.getSource(),
                report.getStatus(),
                report.getCurrentStep(),
                report.getCreatedAt(),
                report.getBusiness(),
                damageTypes,
                report.getFreeFormDescription(),
                report.getRespondent(),
                report.getFacts());
    }
}
