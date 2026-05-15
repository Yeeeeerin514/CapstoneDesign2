package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.config.PublicApiProperties;
import com.albasave.albasave_server.jobposting.dto.ExternalRiskCheck;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Component
public class Work24WageArrearsClient {
    private final PublicApiProperties properties;
    private final RestClient restClient;

    public Work24WageArrearsClient(PublicApiProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.create();
    }

    public ExternalRiskCheck check(String businessName) {
        if (businessName == null || businessName.isBlank()) {
            return new ExternalRiskCheck(
                    "WORK24_WAGE_ARREARS",
                    "SKIPPED",
                    "임금체불 명단 조회 생략",
                    "사업장명이 없어 고용24 임금체불 명단공개 사업주 여부 조회를 호출하지 않았습니다.",
                    "businessName 없음"
            );
        }
        if (properties.work24() == null || !properties.work24().isConfigured()) {
            return ExternalRiskCheck.notConfigured(
                    "WORK24_WAGE_ARREARS",
                    "고용24 임금체불 명단공개 사업주 여부 조회 API 키가 설정되지 않았습니다.",
                    "WORK24_AUTH_KEY"
            );
        }

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(properties.work24().wageArrearsUrl())
                    .queryParam("authKey", properties.work24().authKey())
                    .queryParam("keyword", businessName)
                    .build(true)
                    .toUri();
            String response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(String.class);
            String compact = response == null ? "" : response.replaceAll("\\s+", "");

            if (compact.contains(businessName.replaceAll("\\s+", ""))) {
                return new ExternalRiskCheck(
                        "WORK24_WAGE_ARREARS",
                        "RISK",
                        "임금체불 명단공개 사업주 후보",
                        "고용24 임금체불 명단공개 사업주 조회 응답에서 유사 사업장명이 확인되었습니다. 동명이인/동명업장 가능성이 있어 대표자명과 주소로 재확인이 필요합니다.",
                        "keyword=" + businessName
                );
            }
            return new ExternalRiskCheck(
                    "WORK24_WAGE_ARREARS",
                    "CLEAR",
                    "임금체불 명단공개 조회 완료",
                    "고용24 임금체불 명단공개 사업주 조회 응답에서 해당 사업장명과 직접 일치하는 항목은 확인되지 않았습니다.",
                    "keyword=" + businessName
            );
        } catch (Exception exception) {
            return ExternalRiskCheck.unavailable(
                    "WORK24_WAGE_ARREARS",
                    "고용24 임금체불 명단공개 사업주 조회 API 호출에 실패했습니다.",
                    exception.getClass().getSimpleName()
            );
        }
    }
}
