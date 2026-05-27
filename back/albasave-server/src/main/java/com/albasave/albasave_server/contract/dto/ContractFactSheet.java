package com.albasave.albasave_server.contract.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 진정서 작성에 활용할 정형 데이터.
 * - 사업자등록번호: String (10자리)
 * - 근로 요일: List&lt;DayOfWeek&gt; (Java 표준 enum)
 * - 근로 시작/종료 시각: LocalTime
 * - 입사일: LocalDate
 * - 시급/최저시급: int
 */
public record ContractFactSheet(
        String businessRegistrationNumber,
        List<DayOfWeek> workDays,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm") LocalTime workStartTime,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm") LocalTime workEndTime,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd") LocalDate employmentStartDate,
        Integer hourlyWage,
        int minimumWage
) {
}
