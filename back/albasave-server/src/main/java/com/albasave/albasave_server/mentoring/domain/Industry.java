package com.albasave.albasave_server.mentoring.domain;

/** 업종 — 매칭 카테고리 변수. 같은 업종일 때 indicator(0/1) 매칭. */
public enum Industry {
    FOOD_SERVICE("요식업"),
    DELIVERY("배달·물류"),
    CONVENIENCE_RETAIL("편의점·판매"),
    MANUFACTURING("제조"),
    OFFICE("사무·관리"),
    CONSTRUCTION("건설"),
    SERVICE("서비스"),
    EDUCATION("교육·강사"),
    HEALTHCARE("의료·돌봄"),
    OTHER("기타");

    private final String label;

    Industry(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
