package com.albasave.albasave_server.mentoring.domain;

/** 고용 형태. indicator 매칭. */
public enum EmploymentType {
    SHORT_TERM_PART_TIME("단기알바"),
    LONG_TERM_PART_TIME("장기알바"),
    DAILY_WORKER("일용직"),
    CONTRACT("계약직"),
    FREELANCE("프리랜서"),
    REGULAR("정규직"),
    OTHER("기타");

    private final String label;

    EmploymentType(String label) { this.label = label; }
    public String label() { return label; }
}
