package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.config.PublicApiProperties;
import com.albasave.albasave_server.jobposting.dto.ExternalRiskCheck;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class NtsBusinessStatusClient {
    private final PublicApiProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public NtsBusinessStatusClient(PublicApiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.create();
    }

    public ExternalRiskCheck check(String businessRegistrationNumber) {
        if (businessRegistrationNumber == null || businessRegistrationNumber.isBlank()) {
            return new ExternalRiskCheck(
                    "NTS_BUSINESS_STATUS",
                    "SKIPPED",
                    "사업자등록 상태 조회 생략",
                    "공고 이미지에서 사업자등록번호를 확인하지 못해 국세청 사업자등록 상태조회 API를 호출하지 않았습니다.",
                    "businessRegistrationNumber 없음"
            );
        }
        if (properties.nts() == null || !properties.nts().isConfigured()) {
            return ExternalRiskCheck.notConfigured(
                    "NTS_BUSINESS_STATUS",
                    "국세청 사업자등록 상태조회 API 키가 설정되지 않았습니다.",
                    "NTS_SERVICE_KEY"
            );
        }

        try {
            ObjectNode body = objectMapper.createObjectNode();
            ArrayNode numbers = body.putArray("b_no");
            numbers.add(businessRegistrationNumber.replaceAll("[^0-9]", ""));

            String response = restClient.post()
                    .uri(properties.nts().statusUrl() + "?serviceKey={serviceKey}", properties.nts().serviceKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode data = objectMapper.readTree(response).path("data");
            JsonNode first = data.isArray() && !data.isEmpty() ? data.get(0) : objectMapper.createObjectNode();
            String taxType = text(first, "tax_type");
            String status = text(first, "b_stt");
            String endDate = text(first, "end_dt");
            String evidence = "b_stt=" + status + ", tax_type=" + taxType + ", end_dt=" + endDate;

            if (containsAny(status + " " + taxType, "폐업", "휴업", "말소", "등록되어 있지")) {
                return new ExternalRiskCheck(
                        "NTS_BUSINESS_STATUS",
                        "RISK",
                        "사업자등록 상태 확인 필요",
                        "국세청 사업자등록 상태조회 결과가 정상 영업 상태가 아닐 가능성이 있습니다.",
                        evidence
                );
            }

            return new ExternalRiskCheck(
                    "NTS_BUSINESS_STATUS",
                    "CLEAR",
                    "사업자등록 상태 조회 완료",
                    "국세청 사업자등록 상태조회에서 즉시 위험으로 볼 만한 상태 문구는 확인되지 않았습니다.",
                    evidence
            );
        } catch (Exception exception) {
            return ExternalRiskCheck.unavailable(
                    "NTS_BUSINESS_STATUS",
                    "국세청 사업자등록 상태조회 API 호출에 실패했습니다.",
                    exception.getClass().getSimpleName()
            );
        }
    }

    private String text(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        return value.isMissingNode() || value.isNull() ? "" : value.asText();
    }

    private boolean containsAny(String source, String... needles) {
        for (String needle : needles) {
            if (source.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
