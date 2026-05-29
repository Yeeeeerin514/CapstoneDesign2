package com.albasave.albasave_server.mentoring.domain;

/** 해결 방법 (멘토만 보유). 멘티에게는 이 방법으로 해결한 경험이 매력적. */
public enum ResolutionMethod {
    LABOR_OFFICE_REPORT("노동청 진정"),
    CIVIL_LAWSUIT("민사소송"),
    PAYMENT_ORDER("지급명령"),
    SETTLEMENT("합의"),
    LABOR_ATTORNEY("노무사 상담"),
    OTHER("기타");

    private final String label;

    ResolutionMethod(String label) { this.label = label; }
    public String label() { return label; }
}
