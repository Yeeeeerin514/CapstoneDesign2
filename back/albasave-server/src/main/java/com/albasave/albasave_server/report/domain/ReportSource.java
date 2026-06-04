package com.albasave.albasave_server.report.domain;

import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 신고 사건이 생성된 경로.
 * 프론트 ReportDraftSource("search" | "registered" | "manual")와 1:1.
 */
@Getter
@RequiredArgsConstructor
public enum ReportSource {
    SEARCH("search"),         // 사업장 검색 결과로 생성
    REGISTERED("registered"), // 등록된 알바(PartTimeJob)에서 생성
    MANUAL("manual");         // 사용자가 직접 입력해 생성

    @JsonValue
    private final String json;
}
