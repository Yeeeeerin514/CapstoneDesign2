package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.AnalysisLog;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReportSummary {
    private Long id;
    private String businessName;
    private String violationType;
    private Long unpaidAmount;
    private String status;
    private LocalDateTime createdAt;

    public static ReportSummary from(AnalysisLog entity) {
        return ReportSummary.builder()
                .id(entity.getId())
                .businessName(entity.getBusinessName())
                .violationType(entity.getViolationType())
                .unpaidAmount(entity.getUnpaidAmount())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
