package com.albasave.albasave_server.mentoring.domain;

/**
 * 피해 금액 구간 (서수형). 인접 구간 거리 = 1, 두 구간 거리 = 2, ...
 * 정규화 시 max=4로 나눔.
 */
public enum DamageAmountRange {
    UNDER_100K("10만원 이하", 0),
    KRW_100K_500K("10~50만원", 1),
    KRW_500K_1M("50~100만원", 2),
    KRW_1M_5M("100~500만원", 3),
    OVER_5M("500만원 이상", 4);

    private final String label;
    private final int ordinalIndex;

    DamageAmountRange(String label, int ordinalIndex) {
        this.label = label;
        this.ordinalIndex = ordinalIndex;
    }

    public String label() { return label; }
    public int ordinalIndex() { return ordinalIndex; }

    public static int maxOrdinal() { return 4; }
}
