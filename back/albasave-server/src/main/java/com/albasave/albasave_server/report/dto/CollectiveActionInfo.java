package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.AnalysisLog;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CollectiveActionInfo {
    private Long reportId;
    private String violationType;
    private Long unpaidAmount;
    private LocalDateTime createdAt;

    public static CollectiveActionInfo from(AnalysisLog entity) {
        return CollectiveActionInfo.builder()
                .reportId(entity.getId())
                .violationType(entity.getViolationType())
                .unpaidAmount(entity.getUnpaidAmount())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
