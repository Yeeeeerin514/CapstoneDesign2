package com.albasave.albasave_server.workinglog.dto;

import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Builder
public class PartTimeJobResponse {
    private Long id;
    private Long businessId;
    private String businessName;
    private Integer hourlyWage;
    private String day;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate startDay;
    private LocalDate endDay;
    private Boolean isActive;
    private String bssid;
    private String contract;

    public static PartTimeJobResponse from(PartTimeJob job) {
        return PartTimeJobResponse.builder()
                .id(job.getId())
                .businessId(job.getBusinessId())
                .businessName(job.getBusinessName())
                .hourlyWage(job.getHourlyWage())
                .day(job.getDay())
                .startTime(job.getStartTime())
                .endTime(job.getEndTime())
                .startDay(job.getStartDay())
                .endDay(job.getEndDay())
                .isActive(job.getIsActive())
                .bssid(job.getBssid())
                .contract(job.getContract())
                .build();
    }
}
