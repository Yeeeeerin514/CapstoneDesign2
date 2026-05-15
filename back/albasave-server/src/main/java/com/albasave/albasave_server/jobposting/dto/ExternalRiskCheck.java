package com.albasave.albasave_server.jobposting.dto;

public record ExternalRiskCheck(
        String source,
        String status,
        String title,
        String description,
        String evidence
) {
    public static ExternalRiskCheck notConfigured(String source, String title, String evidence) {
        return new ExternalRiskCheck(
                source,
                "NOT_CONFIGURED",
                title,
                "API 인증키가 설정되지 않아 외부 공공 API 조회를 수행하지 않았습니다.",
                evidence
        );
    }

    public static ExternalRiskCheck unavailable(String source, String title, String evidence) {
        return new ExternalRiskCheck(
                source,
                "UNAVAILABLE",
                title,
                "외부 공공 API 호출 중 오류가 발생했습니다. 네트워크, 인증키, API 명세 변경 여부를 확인해야 합니다.",
                evidence
        );
    }
}
