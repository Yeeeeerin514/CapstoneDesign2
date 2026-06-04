package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.BusinessType;
import com.albasave.albasave_server.report.domain.RespondentInfo;

/** 진정서 "2. 피진정인" 폼 — 프론트 ComplaintRespondent와 1:1. 모든 필드 nullable. */
public record RespondentDto(
        String representativeName,
        String phone,
        String address,
        BusinessType businessType,
        String workplaceName,
        String workplacePhone,
        Integer employeeCount
) {
    public RespondentInfo toEntity() {
        return RespondentInfo.builder()
                .representativeName(representativeName)
                .phone(phone)
                .address(address)
                .businessType(businessType)
                .workplaceName(workplaceName)
                .workplacePhone(workplacePhone)
                .employeeCount(employeeCount)
                .build();
    }
}
