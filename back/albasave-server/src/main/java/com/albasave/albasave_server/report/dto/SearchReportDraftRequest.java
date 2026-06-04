package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.BusinessSnapshot;
import com.albasave.albasave_server.report.domain.ReportSource;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * source="search" — 사업장 검색 결과로 신고 생성.
 * 검색 API가 사업자등록번호·대표자·관할 노동지청까지 모두 채워서 보낸다.
 */
@Getter
@NoArgsConstructor
public class SearchReportDraftRequest extends CreateReportDraftRequest {

    private String businessRegistrationNumber;
    private String businessName;
    private String businessCategory;
    private String businessAddress;
    private String businessPhone;
    private String representativeName;
    private String laborOffice;

    @Override
    public ReportSource getSource() {
        return ReportSource.SEARCH;
    }

    @Override
    public ReportDraftSpec resolve(PartTimeJobLookup lookup) {
        BusinessSnapshot snapshot = BusinessSnapshot.builder()
                .name(businessName)
                .registrationNumber(businessRegistrationNumber)
                .category(businessCategory)
                .address(businessAddress)
                .phone(businessPhone)
                .representativeName(representativeName)
                .laborOffice(laborOffice)
                .build();
        return ReportDraftSpec.of(snapshot);
    }
}
