package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.BusinessSnapshot;
import com.albasave.albasave_server.report.domain.ReportSource;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * source="manual" — 사용자가 사업장 정보를 직접 입력해 신고 생성.
 * 검색에 안 잡히는 사업장이므로 최소 정보만 받는다.
 */
@Getter
@NoArgsConstructor
public class ManualReportDraftRequest extends CreateReportDraftRequest {

    private String businessName;
    private String businessRegistrationNumber;
    private String businessAddress;

    @Override
    public ReportSource getSource() {
        return ReportSource.MANUAL;
    }

    @Override
    public ReportDraftSpec resolve(PartTimeJobLookup lookup) {
        BusinessSnapshot snapshot = BusinessSnapshot.builder()
                .name(businessName)
                .registrationNumber(businessRegistrationNumber)
                .address(businessAddress)
                .build();
        return ReportDraftSpec.of(snapshot);
    }
}
