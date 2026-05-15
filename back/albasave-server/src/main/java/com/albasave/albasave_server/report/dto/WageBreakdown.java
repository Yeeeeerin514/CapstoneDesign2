package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.service.WageCalculationService;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WageBreakdown {
    private int hourlyWage;
    private long totalWorkMinutes;
    private double totalWorkHours;
    private long basePay;
    private long weeklyHolidayPay;
    private long overtimePay;
    private long nightPay;
    private long totalShouldReceive;
    private int minimumWage;

    public static WageBreakdown from(WageCalculationService.WageCalculationResult r) {
        return WageBreakdown.builder()
                .hourlyWage(r.getHourlyWage())
                .totalWorkMinutes(r.getTotalWorkMinutes())
                .totalWorkHours(r.getTotalWorkMinutes() / 60.0)
                .basePay(r.getTotalBasePay())
                .weeklyHolidayPay(r.getTotalWeeklyHolidayPay())
                .overtimePay(r.getTotalOvertimePay())
                .nightPay(r.getTotalNightPay())
                .totalShouldReceive(r.getTotalShouldReceive())
                .minimumWage(r.getMinimumWage())
                .build();
    }
}
