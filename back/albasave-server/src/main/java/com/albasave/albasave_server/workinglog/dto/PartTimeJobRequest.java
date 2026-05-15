package com.albasave.albasave_server.workinglog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
public class PartTimeJobRequest {
    private Long businessId;
    private String businessName;

    @NotBlank
    private String day;

    @NotNull
    private LocalTime startTime;

    @NotNull
    private LocalTime endTime;

    @NotNull
    private LocalDate startDay;

    private LocalDate endDay;
    private int hourlyWage;
}
