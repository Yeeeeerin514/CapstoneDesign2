package com.albasave.albasave_server.mentoring.domain;

/**
 * 피해 유형 (다중선택). Jaccard 유사도로 비교.
 * 멘티의 damageTypes ∩ 멘토의 damageTypes / 합집합.
 */
public enum DamageType {
    WAGE_ARREARS("임금체불"),
    SEVERANCE_PAY("퇴직금 미지급"),
    WEEKLY_HOLIDAY("주휴수당 미지급"),
    OVERTIME_PAY("연장·야간수당 미지급"),
    INSURANCE("4대보험 미가입"),
    UNFAIR_DISMISSAL("부당해고"),
    INDUSTRIAL_ACCIDENT("산재"),
    UNPAID_BONUS("상여금 미지급"),
    CONTRACT_BREACH("계약 위반"),
    OTHER("기타");

    private final String label;

    DamageType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
