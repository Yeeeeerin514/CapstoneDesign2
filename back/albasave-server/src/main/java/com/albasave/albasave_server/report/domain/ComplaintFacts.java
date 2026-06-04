package com.albasave.albasave_server.report.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 진정서 "3. 진정 내용" 항목 — 사용자가 단계별로 채우는 사실관계.
 * 모든 필드 nullable (중간 저장 허용). 날짜류는 프론트가 보내는 문자열을 그대로 보관해
 * 포맷 가정 없이 멱등 라운드트립을 보장한다.
 */
@Embeddable
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintFacts {

    @Column(name = "facts_employment_start_date", length = 30)
    private String employmentStartDate;

    @Column(name = "facts_employment_end_date", length = 30)
    private String employmentEndDate;

    @Column(name = "facts_total_unpaid_wage")
    private Integer totalUnpaidWage;

    @Enumerated(EnumType.STRING)
    @Column(name = "facts_employment_status", length = 20)
    private EmploymentStatus employmentStatus;

    @Column(name = "facts_unpaid_severance")
    private Integer unpaidSeverance;

    @Column(name = "facts_other_unpaid")
    private Integer otherUnpaid;

    @Column(name = "facts_job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "facts_wage_payment_date", length = 30)
    private String wagePaymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "facts_contract_method", length = 20)
    private ContractMethod contractMethod;
}
