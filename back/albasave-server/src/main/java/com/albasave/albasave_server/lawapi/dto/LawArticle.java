package com.albasave.albasave_server.lawapi.dto;

/** 법제처 국가법령정보 API에서 받은 단일 조문. */
public record LawArticle(
        String lawName,         // 예: "근로기준법"
        String articleNumber,   // 예: "55", "56", "60"
        String articleTitle,    // 예: "휴일"
        String body             // 조문 본문 텍스트
) {
}
