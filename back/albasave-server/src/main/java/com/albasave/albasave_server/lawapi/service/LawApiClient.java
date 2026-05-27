package com.albasave.albasave_server.lawapi.service;

import com.albasave.albasave_server.lawapi.config.LawApiProperties;
import com.albasave.albasave_server.lawapi.dto.LawArticle;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * 법제처 국가법령정보 공동활용 API 클라이언트.
 * 호출 예: https://www.law.go.kr/DRF/lawService.do?OC=albasave&target=law&LM=근로기준법&type=JSON
 *
 * 응답 구조 (요약):
 *   법령.조문.조문단위[] -> { 조문번호, 조문제목, 조문내용, ... }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LawApiClient {

    private final LawApiProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.create();

    public List<LawArticle> fetchLaw(String lawName) {
        if (!properties.isConfigured()) {
            log.warn("[LawApi] OC 미설정 — {} 조회 건너뜀", lawName);
            return List.of();
        }
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(properties.baseUrl() + "/lawService.do")
                    .queryParam("OC", properties.oc())
                    .queryParam("target", "law")
                    .queryParam("LM", lawName)
                    .queryParam("type", "JSON")
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();

            String response = restClient.get().uri(uri).retrieve().body(String.class);
            if (response == null || response.isBlank()) {
                return List.of();
            }

            JsonNode root = objectMapper.readTree(response);
            JsonNode units = root.path("법령").path("조문").path("조문단위");
            if (!units.isArray()) {
                log.warn("[LawApi] {} 응답에 조문단위 배열이 없습니다", lawName);
                return List.of();
            }

            List<LawArticle> out = new ArrayList<>();
            for (JsonNode jo : units) {
                String number = textValue(jo, "조문번호");
                if (number == null || number.isBlank()) continue;
                String title = textValue(jo, "조문제목");
                String body = textValue(jo, "조문내용");
                if (body == null) body = "";
                out.add(new LawArticle(lawName, number, title == null ? "" : title, body.trim()));
            }
            log.info("[LawApi] {} 조문 {}건 로드 완료", lawName, out.size());
            return out;
        } catch (Exception e) {
            log.error("[LawApi] {} 호출 실패: {}", lawName, e.getMessage());
            return List.of();
        }
    }

    private String textValue(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        if (value.isTextual()) return value.asText();
        if (value.isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode child : value) {
                if (child.isTextual()) sb.append(child.asText()).append(' ');
            }
            return sb.toString().trim();
        }
        return value.toString();
    }
}
