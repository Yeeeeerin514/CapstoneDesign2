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
 * 진정서 "2. 피진정인" 항목 — 사용자가 폼에서 확정/수정한 값을 그대로 박제.
 * 모든 필드 nullable (단계별 부분 저장 허용).
 *
 * 주의: 이건 draft 때 만든 BusinessSnapshot(사업장 식별 정보)과는 별개다.
 *       스냅샷은 진정서 작성 폼을 "미리 채우는" 출처일 뿐, 여기 저장되는 값은
 *       사용자가 최종 확인/수정한 진정서용 피진정인 정보다.
 */
@Embeddable
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RespondentInfo {

    @Column(name = "resp_representative_name", length = 100)
    private String representativeName;

    @Column(name = "resp_phone", length = 50)
    private String phone;

    @Column(name = "resp_address", length = 1000)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "resp_business_type", length = 30)
    private BusinessType businessType;

    @Column(name = "resp_workplace_name", length = 300)
    private String workplaceName;

    @Column(name = "resp_workplace_phone", length = 50)
    private String workplacePhone;

    @Column(name = "resp_employee_count")
    private Integer employeeCount;
}
