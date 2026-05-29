package com.albasave.albasave_server.wagearrears.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 고용노동부 체불사업주 명단공개 데이터.
 * CSV(대표자명, 상호명, 제외일자)에서 임포트한다.
 */
@Entity
@Table(name = "wage_arrears_employer", indexes = {
        @Index(name = "idx_wae_business_name", columnList = "businessName"),
        @Index(name = "idx_wae_normalized_name", columnList = "normalizedName")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WageArrearsEmployer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 100)
    private String representativeName;

    @Column(length = 200, nullable = false)
    private String businessName;

    /** 공백/특수문자 제거한 매칭용 키 */
    @Column(length = 200, nullable = false)
    private String normalizedName;

    /** 명단 제외일자 (CSV 원본 컬럼) */
    private LocalDate excludeDate;

    public WageArrearsEmployer(String representativeName, String businessName, LocalDate excludeDate) {
        this.representativeName = representativeName;
        this.businessName = businessName;
        this.normalizedName = normalize(businessName);
        this.excludeDate = excludeDate;
    }

    public static String normalize(String name) {
        if (name == null) return "";
        return name.replaceAll("\\s+", "")
                .replaceAll("[(){}\\[\\]·.,'\"]", "")
                .toLowerCase();
    }
}
