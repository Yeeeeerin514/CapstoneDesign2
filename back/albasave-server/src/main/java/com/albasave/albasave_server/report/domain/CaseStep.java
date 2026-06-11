package com.albasave.albasave_server.report.domain;

import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 신고 진행 단계 — 프론트 CaseStep과 1:1 (lower_snake_case로 직렬화).
 * DB에는 EnumType.STRING(상수명)으로 저장되고, JSON 응답은 @JsonValue로 변환된다.
 */
@Getter
@RequiredArgsConstructor
public enum CaseStep {
    EVIDENCE_COLLECTION("evidence_collection"), // 1. 신고 정보 입력
    COMPLAINT_DRAFT("complaint_draft"),         // 2. 진정서 작성
    SUBMISSION("submission"),                   // 3. 노동청 제출
    INVESTIGATION("investigation");             // 4. 조사 및 해결

    @JsonValue
    private final String json;

    /** 프론트 lower_snake 표기(또는 상수명)를 CaseStep으로 변환. 미일치 시 null. */
    public static CaseStep fromJson(String raw) {
        if (raw == null || raw.isBlank()) return null;
        for (CaseStep s : values()) {
            if (s.json.equalsIgnoreCase(raw.trim()) || s.name().equalsIgnoreCase(raw.trim())) {
                return s;
            }
        }
        return null;
    }
}
