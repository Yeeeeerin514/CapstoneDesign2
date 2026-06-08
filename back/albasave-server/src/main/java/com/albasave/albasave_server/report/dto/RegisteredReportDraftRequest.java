package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.business.domain.Business;
import com.albasave.albasave_server.report.domain.BusinessSnapshot;
import com.albasave.albasave_server.report.domain.ReportSource;
import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * source="registered" — 이미 등록된 알바(PartTimeJob)에서 신고 생성.
 * 사업장 정보는 PartTimeJob에 연결된 Business에서 가져온다.
 *
 * 단, Business 엔티티에는 사업자등록번호·대표자·관할 노동지청이 없으므로
 * 해당 항목은 null로 두고 이후 evidence 단계에서 보완한다.
 */
@Getter
@NoArgsConstructor
public class RegisteredReportDraftRequest extends CreateReportDraftRequest {

    private Long partTimeJobId;

    @Override
    public ReportSource getSource() {
        return ReportSource.REGISTERED;
    }

    @Override
    public ReportDraftSpec resolve(PartTimeJobLookup lookup) {
        if (partTimeJobId == null) {
            throw new IllegalArgumentException("partTimeJobId가 필요합니다.");
        }
        PartTimeJob job = lookup.find(partTimeJobId);
        // BSSID 등록 알바(/working/register-workplace 경로)는 Business 미연결 → null 가능.
        // 이 경우 사업장명은 PartTimeJob.businessName, 주소/업종/전화는 null로 두고 evidence 단계에서 보완.
        Business biz = job.getBusiness();

        String name = (biz != null && biz.getName() != null) ? biz.getName() : job.getBusinessName();
        String address = null;
        String category = null;
        String phone = null;
        if (biz != null) {
            address = (biz.getRoadAddress() != null && !biz.getRoadAddress().isBlank())
                    ? biz.getRoadAddress()
                    : biz.getLocalAddress();
            category = biz.getIndustry();
            phone = biz.getPhone();
        }

        BusinessSnapshot snapshot = BusinessSnapshot.builder()
                .name(name)
                .registrationNumber(null)      // Business 엔티티에 미보유
                .category(category)
                .address(address)
                .phone(phone)
                .representativeName(null)       // Business 엔티티에 미보유
                .laborOffice(null)              // 주소 기반 관할 매핑은 추후
                .build();

        return new ReportDraftSpec(snapshot, job);
    }
}
