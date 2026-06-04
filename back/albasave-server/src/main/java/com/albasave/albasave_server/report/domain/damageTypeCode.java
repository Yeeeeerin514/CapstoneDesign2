package com.albasave.albasave_server.report.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum damageTypeCode {
    // code: 내부 정수 코드 / frontendKey: 프론트 DamageTypeEnum 문자열 / description: 진정서 표기 라벨
    BASIC_WAGE_UNPAID(1, "BASE_WAGE", "임금(기본급) 미지급"),
    WEEKLY_HOLIDAY_PAY_UNPAID(2, "WEEKLY_HOLIDAY", "주휴수당 미지급"),
    OVERTIME_UNPAID(3, "OVERTIME", "연장근로수당 미지급"),
    NIGHT_UNPAID(4, "NIGHT", "야간근로수당 미지급"),
    SEVERANCE_UNPAID(5, "SEVERANCE", "퇴직금 미지급");

    private final int code;
    private final String frontendKey;
    private final String description;

    public static damageTypeCode fromCode(int code) {
        for (damageTypeCode type : values()) {
            if (type.code == code) return type;
        }
        throw new IllegalArgumentException("유효하지 않은 체불 유형 코드: " + code);
    }

    /** 프론트 DamageTypeEnum 문자열(BASE_WAGE 등)을 체불 유형으로 변환. */
    public static damageTypeCode fromFrontendKey(String key) {
        for (damageTypeCode type : values()) {
            if (type.frontendKey.equals(key)) return type;
        }
        throw new IllegalArgumentException("유효하지 않은 피해 유형: " + key);
    }
}
