package com.albasave.albasave_server.jobposting.dto;

import java.util.List;

public record ExtractedJobPosting(
        String businessName,
        String brandName,
        String businessRegistrationNumber,
        String phone,
        String address,
        String jobTitle,
        String industryHint,
        String hourlyWageText,
        Integer hourlyWage,
        String workScheduleText,
        List<String> workDays,
        String workTimeText,
        /** 계약기간/근무기간 원문 (예: "6개월~1년(협의가능)"). 추출 못 하면 null. */
        String contractPeriod,
        String employmentType,
        List<String> benefits,
        List<String> suspiciousPhrases,
        List<String> missingInformation,
        List<LlmConcern> llmConcerns,
        String overallAssessment,
        String rawSummary
) {
    public static ExtractedJobPosting empty() {
        return new ExtractedJobPosting(
                null, null, null, null, null, null, null, null, null, null,
                List.of(),
                null, null, null,
                List.of(), List.of(), List.of(), List.of(),
                null, null
        );
    }
}
