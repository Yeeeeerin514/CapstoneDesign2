package com.albasave.albasave_server.lawapi.dto;

/**
 * 의미 검색 결과 1건.
 * distance가 작을수록 유사 (cosine distance: 0=동일, 2=정반대).
 */
public record LawChunkMatch(
        Long id,
        String sourceType,
        String lawName,
        String articleNumber,
        String articleTitle,
        Integer partNo,
        String content,
        double distance
) {
    /** 사용자 표시용 헤더 — 출처 유형별로 다르게. */
    public String header() {
        if ("PRECEDENT".equals(sourceType)) {
            return "[판례] " + (lawName == null ? "" : lawName + " ")
                    + (articleTitle == null || articleTitle.isBlank() ? "" : "— " + articleTitle);
        }
        if ("INTERPRETATION".equals(sourceType)) {
            return "[해석례] " + (lawName == null ? "" : lawName + " ")
                    + (articleTitle == null || articleTitle.isBlank() ? "" : "— " + articleTitle);
        }
        if (articleTitle == null || articleTitle.isBlank()) {
            return lawName + " 제" + articleNumber + "조";
        }
        return lawName + " 제" + articleNumber + "조(" + articleTitle + ")";
    }
}
