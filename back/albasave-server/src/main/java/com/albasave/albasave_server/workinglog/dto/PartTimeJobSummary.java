package com.albasave.albasave_server.workinglog.dto;

import com.albasave.albasave_server.workinglog.domain.DayBitmask;
import com.albasave.albasave_server.workinglog.domain.PartTimeJob;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 관심업장/근무업장 목록 응답 항목.
 * 프론트의 관심업장·근무업장 카드 렌더에 필요한 필드만 노출한다.
 */
public record PartTimeJobSummary(
        Long partTimeJobId,
        String status,            // "FAVORITE" | "REGISTERED"
        String businessName,
        Integer hourlyWage,
        List<String> workDays,    // DayOfWeek 이름 배열 (비트마스크 디코딩)
        LocalTime startTime,
        LocalTime endTime,
        LocalDate startDay,
        String bssid,
        Boolean isActive,
        Long jobPostingAnalysisId
) {
    public static PartTimeJobSummary from(PartTimeJob job) {
        return new PartTimeJobSummary(
                job.getId(),
                job.getStatus() == null ? "REGISTERED" : job.getStatus().name(),
                job.getBusinessName(),
                job.getHourlyWage(),
                DayBitmask.toDayNames(job.getDays()),
                job.getStartTime(),
                job.getEndTime(),
                job.getStartDay(),
                job.getBssid(),
                job.getIsActive(),
                job.getJobPostingAnalysisId()
        );
    }
}
