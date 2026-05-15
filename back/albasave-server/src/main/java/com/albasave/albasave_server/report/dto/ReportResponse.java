package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.AnalysisLog;
import com.albasave.albasave_server.report.service.WageCalculationService;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ReportResponse {
    private Long id;
    private String businessName;
    private String businessRegistrationNumber;
    private String violationType;
    private Long unpaidAmount;
    private String description;
    private String evidenceImageUrl;
    private String complaintDraft;
    private String complaintPdfUrl;
    private String status;
    private LocalDateTime createdAt;
    private WageBreakdown wageBreakdown;
    private List<CollectiveActionInfo> collectiveActionCandidates;
    private boolean hasCollectiveActionPartners;

    public static ReportResponse from(AnalysisLog entity,
                                       WageCalculationService.WageCalculationResult wage,
                                       List<CollectiveActionInfo> candidates) {
        return ReportResponse.builder()
                .id(entity.getId())
                .businessName(entity.getBusinessName())
                .businessRegistrationNumber(entity.getBusinessRegistrationNumber())
                .violationType(entity.getViolationType())
                .unpaidAmount(entity.getUnpaidAmount())
                .description(entity.getDescription())
                .evidenceImageUrl(entity.getEvidenceImageUrl())
                .complaintDraft(entity.getComplaintDraft())
                .complaintPdfUrl(entity.getComplaintPdfUrl())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .wageBreakdown(WageBreakdown.from(wage))
                .collectiveActionCandidates(candidates)
                .hasCollectiveActionPartners(!candidates.isEmpty())
                .build();
    }
}
