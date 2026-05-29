package com.albasave.albasave_server.mentoring.domain;

/** 해결 기간 구간 (멘토 전용). 빠르게 해결한 멘토일수록 매력적. */
public enum ResolutionDurationRange {
    UNDER_1M("1개월 이하", 0),
    MONTH_1_TO_3("1~3개월", 1),
    MONTH_3_TO_6("3~6개월", 2),
    OVER_6M("6개월 이상", 3),
    UNKNOWN("확인불가", -1);

    private final String label;
    private final int ordinalIndex;

    ResolutionDurationRange(String label, int ordinalIndex) {
        this.label = label;
        this.ordinalIndex = ordinalIndex;
    }

    public String label() { return label; }
    public int ordinalIndex() { return ordinalIndex; }

    public static ResolutionDurationRange fromDays(Integer days) {
        if (days == null || days <= 0) return UNKNOWN;
        if (days <= 30) return UNDER_1M;
        if (days <= 90) return MONTH_1_TO_3;
        if (days <= 180) return MONTH_3_TO_6;
        return OVER_6M;
    }
}
