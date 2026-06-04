package com.albasave.albasave_server.report.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 신고 시점의 사업장 정보 스냅샷.
 *
 * Business 테이블을 FK로 거는 대신 신고 생성 시점의 값을 그대로 박제한다.
 *  - 검색/수동 입력 신고는 Business 테이블에 없을 수 있다.
 *  - 사업자등록번호·대표자·관할 노동지청은 Business 엔티티에 아예 없는 값이라 별도 보관이 필요하다.
 *  - 외부 데이터가 바뀌어도 진정서에 쓰인 사업장 정보는 변하면 안 된다.
 *
 * 필드명은 프론트 BusinessInfo와 1:1 → 응답 DTO의 business 블록으로 그대로 직렬화된다.
 */
@Embeddable
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusinessSnapshot {

    @Column(name = "biz_name", length = 300)
    private String name;

    @Column(name = "biz_registration_number", length = 30)
    private String registrationNumber;

    @Column(name = "biz_category", length = 100)
    private String category;

    @Column(name = "biz_address", length = 1000)
    private String address;

    @Column(name = "biz_phone", length = 50)
    private String phone;

    @Column(name = "biz_representative_name", length = 100)
    private String representativeName;

    @Column(name = "biz_labor_office", length = 200)
    private String laborOffice;
}
