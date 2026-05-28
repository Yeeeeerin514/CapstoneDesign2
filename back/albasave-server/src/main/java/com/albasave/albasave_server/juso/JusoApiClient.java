package com.albasave.albasave_server.juso;

import com.albasave.albasave_server.jobposting.dto.ExternalRiskCheck;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;

/**
 * 도로명주소 검색 API 클라이언트.
 *
 * 공고에서 추출된 주소가 실제 도로명주소 DB에 존재하는지 검증한다.
 * - 0건이면 가짜 주소 의심 → RISK
 * - 1건 이상이면 표준 도로명주소 + 우편번호 + 건물명 반환 → CLEAR
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JusoApiClient {

    private final JusoProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.create();

    public ExternalRiskCheck check(String addressText) {
        if (addressText == null || addressText.isBlank()) {
            return new ExternalRiskCheck(
                    "JUSO_ADDRESS",
                    "SKIPPED",
                    "도로명주소 검증 생략",
                    "공고문에서 주소를 확인하지 못해 도로명주소 검증을 수행하지 않았습니다.",
                    "address 없음"
            );
        }
        if (!properties.isConfigured()) {
            return ExternalRiskCheck.notConfigured(
                    "JUSO_ADDRESS",
                    "도로명주소 검색 API 키가 설정되지 않았습니다.",
                    "JUSO_API_KEY"
            );
        }

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(properties.baseUrl())
                    .queryParam("confmKey", properties.confmKey())
                    .queryParam("currentPage", 1)
                    .queryParam("countPerPage", 3)
                    .queryParam("keyword", addressText)
                    .queryParam("resultType", "json")
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();

            String response = restClient.get().uri(uri).retrieve().body(String.class);
            JsonNode root = objectMapper.readTree(response);
            JsonNode common = root.path("results").path("common");
            String errorCode = common.path("errorCode").asText("");
            if (!"0".equals(errorCode)) {
                String msg = common.path("errorMessage").asText("");
                return ExternalRiskCheck.unavailable(
                        "JUSO_ADDRESS",
                        "도로명주소 API 응답 오류: " + msg,
                        "errorCode=" + errorCode
                );
            }

            int totalCount = common.path("totalCount").asInt(0);
            JsonNode jusos = root.path("results").path("juso");
            if (totalCount == 0 || !jusos.isArray() || jusos.isEmpty()) {
                return new ExternalRiskCheck(
                        "JUSO_ADDRESS",
                        "RISK",
                        "주소 진위 의심",
                        "공고문에서 추출한 주소가 도로명주소 DB에서 확인되지 않습니다. 가짜/잘못된 주소일 가능성이 있어 지원 전 확인이 필요합니다.",
                        "keyword=" + addressText
                );
            }

            JsonNode top = jusos.get(0);
            String roadAddr = text(top, "roadAddr");
            String jibunAddr = text(top, "jibunAddr");
            String bdNm = text(top, "bdNm");
            String zipNo = text(top, "zipNo");
            StringBuilder evidence = new StringBuilder();
            evidence.append("도로명: ").append(roadAddr);
            if (!bdNm.isBlank()) evidence.append(", 건물: ").append(bdNm);
            if (!zipNo.isBlank()) evidence.append(", 우편번호: ").append(zipNo);
            if (!jibunAddr.isBlank()) evidence.append(", 지번: ").append(jibunAddr);

            return new ExternalRiskCheck(
                    "JUSO_ADDRESS",
                    "CLEAR",
                    "도로명주소 진위 확인",
                    "공고문 주소가 도로명주소 DB에서 정상 확인되었습니다. 표준 도로명: " + roadAddr
                            + (bdNm.isBlank() ? "" : " (" + bdNm + ")") + ".",
                    evidence.toString()
            );
        } catch (Exception e) {
            log.error("[JusoApi] 호출 실패: {}", e.getMessage());
            return ExternalRiskCheck.unavailable(
                    "JUSO_ADDRESS",
                    "도로명주소 검색 API 호출에 실패했습니다.",
                    e.getClass().getSimpleName()
            );
        }
    }

    private String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) return "";
        return v.isTextual() ? v.asText() : v.toString();
    }
}
