package com.albasave.albasave_server.report.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class CreateReportRequest {

    private Long partTimeJobId;

    private String businessRegistrationNumber;
    private Long businessId;

    @NotBlank
    private String businessName;

    /** MINIMUM_WAGE / WEEKLY_HOLIDAY / OVERTIME / NIGHT / OTHER */
    private String violationType;

    @NotBlank
    private String description;

    /** 계약 시급 (0이면 최저시급 적용) */
    private int hourlyWage;

    /** 실제로 받은 금액 (있으면 체불액 자동 계산) */
    private Long actualReceivedAmount;

    /** 직접 입력한 체불액 (actualReceivedAmount가 없을 때) */
    private Long manualUnpaidAmount;

    private String evidenceImageUrl;
}
