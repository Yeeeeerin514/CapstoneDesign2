package com.albasave.albasave_server.jobposting.dto;

import java.util.List;

public record ExtractedJobPosting(
        String businessName,
        String brandName,
        String address,
        String jobTitle,
        String industryHint,
        String hourlyWageText,
        Integer hourlyWage,
        String workScheduleText,
        List<String> workDays,
        String workTimeText,
        String employmentType,
        List<String> benefits,
        List<String> suspiciousPhrases,
        List<String> missingInformation,
        String rawSummary
) {
    public static ExtractedJobPosting empty() {
        return new ExtractedJobPosting(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(),
                null,
                null,
                List.of(),
                List.of(),
                List.of(),
                null
        );
    }
}
