package com.albasave.albasave_server.mentoring.domain;

/**
 * 사업장 규모. 근로기준법 적용 차이로 매칭 가중치 ↑↑↑.
 * - 5인 미만: 연장수당·연차·주휴 등 일부 조항 미적용
 * - 5~30인: 표준 적용
 * - 30인 이상: 노조·취업규칙 등 추가 의무
 */
public enum BusinessSize {
    UNDER_5("5인 미만"),
    SIZE_5_TO_30("5~30인"),
    OVER_30("30인 이상"),
    UNKNOWN("확인불가");

    private final String label;

    BusinessSize(String label) { this.label = label; }
    public String label() { return label; }
}
