package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.ComplaintFacts;
import com.albasave.albasave_server.report.domain.ContractMethod;
import com.albasave.albasave_server.report.domain.EmploymentStatus;

/** 진정서 "3. 진정 내용" 폼 — 프론트 ComplaintFacts와 1:1. 모든 필드 nullable. */
public record FactsDto(
        String employmentStartDate,
        String employmentEndDate,
        Integer totalUnpaidWage,
        EmploymentStatus employmentStatus,
        Integer unpaidSeverance,
        Integer otherUnpaid,
        String jobDescription,
        String wagePaymentDate,
        ContractMethod contractMethod
) {
    public ComplaintFacts toEntity() {
        return ComplaintFacts.builder()
                .employmentStartDate(employmentStartDate)
                .employmentEndDate(employmentEndDate)
                .totalUnpaidWage(totalUnpaidWage)
                .employmentStatus(employmentStatus)
                .unpaidSeverance(unpaidSeverance)
                .otherUnpaid(otherUnpaid)
                .jobDescription(jobDescription)
                .wagePaymentDate(wagePaymentDate)
                .contractMethod(contractMethod)
                .build();
    }
}
