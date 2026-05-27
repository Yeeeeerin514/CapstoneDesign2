package com.albasave.albasave_server.jobposting.dto;

/**
 * OpenAI(LLM)가 공고 이미지를 직접 읽고 판단한 위법성/이상 사항.
 * RiskAnalyzer가 룰베이스 concerns 옆에 그대로 합산한다.
 */
public record LlmConcern(
        String category,   // WAGE | ALLOWANCE | CONDITION | PENALTY | CONTRACT | POSTING_PATTERN | OTHER
        String severity,   // HIGH | MEDIUM | LOW
        String title,
        String description,
        String evidence    // 공고에서 인용한 문구
) {
}
