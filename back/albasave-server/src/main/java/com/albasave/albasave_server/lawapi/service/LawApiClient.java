package com.albasave.albasave_server.lawapi.service;

import com.albasave.albasave_server.lawapi.config.LawApiProperties;
import com.albasave.albasave_server.lawapi.dto.LawArticle;
import com.albasave.albasave_server.lawapi.dto.LawDocument;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
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
                // "조문여부"가 "조문"이 아닌 경우(편/장/절 제목 등) 건너뜀
                String type = textValue(jo, "조문여부");
                if (type != null && !"조문".equals(type)) continue;

                String number = textValue(jo, "조문번호");
                if (number == null || number.isBlank()) continue;
                String title = textValue(jo, "조문제목");
                String body = buildArticleBody(jo);
                out.add(new LawArticle(lawName, number, title == null ? "" : title, body));
            }
            log.info("[LawApi] {} 조문 {}건 로드 완료", lawName, out.size());
            return out;
        } catch (Exception e) {
            log.error("[LawApi] {} 호출 실패: {}", lawName, e.getMessage());
            return List.of();
        }
    }

    /**
     * 조문 본문을 합성한다.
     * - "조문내용" 필드는 보통 제목("제55조(휴일)")만 들어있음
     * - 실제 본문은 "항" 배열의 각 "항내용"에 들어있음 (또 "호" 배열로 중첩 가능)
     * - 항이 없는 단순 조문은 "조문내용" 그대로 사용
     */
    private String buildArticleBody(JsonNode article) {
        StringBuilder sb = new StringBuilder();

        // 조문 제목 + 본문 머리
        String head = textValue(article, "조문내용");
        if (head != null && !head.isBlank()) {
            sb.append(head.trim()).append('\n');
        }

        JsonNode hangs = article.path("항");
        if (hangs.isArray() && hangs.size() > 0) {
            for (JsonNode hang : hangs) {
                appendHang(sb, hang);
            }
        } else if (hangs.isObject()) {
            // 항이 1개일 때는 객체로 올 수도 있음
            appendHang(sb, hangs);
        }

        return sb.toString().trim();
    }

    private void appendHang(StringBuilder sb, JsonNode hang) {
        String content = textValue(hang, "항내용");
        if (content != null && !content.isBlank()) {
            sb.append(content.trim()).append('\n');
        }
        JsonNode hos = hang.path("호");
        if (hos.isArray()) {
            for (JsonNode ho : hos) {
                String hoContent = textValue(ho, "호내용");
                if (hoContent != null && !hoContent.isBlank()) {
                    sb.append("  ").append(hoContent.trim()).append('\n');
                }
                JsonNode moks = ho.path("목");
                if (moks.isArray()) {
                    for (JsonNode mok : moks) {
                        String mokContent = textValue(mok, "목내용");
                        if (mokContent != null && !mokContent.isBlank()) {
                            sb.append("    ").append(mokContent.trim()).append('\n');
                        }
                    }
                }
            }
        } else if (hos.isObject()) {
            String hoContent = textValue(hos, "호내용");
            if (hoContent != null && !hoContent.isBlank()) {
                sb.append("  ").append(hoContent.trim()).append('\n');
            }
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

    // ─────────────────────────────────────────────────────────────────
    //  Level 3 RAG — 판례(prec) / 법령해석례(expc)
    // ─────────────────────────────────────────────────────────────────

    /**
     * 판례 검색 + 각 건의 상세 본문까지 한번에 가져온다.
     *
     * @param query   검색 키워드 (예: "주휴수당", "임금체불")
     * @param display 검색 최대 건수 (1~100)
     */
    public List<LawDocument> fetchPrecedents(String query, int display) {
        return fetchDocuments("prec", query, display, "PrecSearch", "prec",
                "판례일련번호",
                this::mapPrecedentDetail);
    }

    /** 법령해석례 검색 + 상세. */
    public List<LawDocument> fetchInterpretations(String query, int display) {
        return fetchDocuments("expc", query, display, "Expc", "expc",
                "법령해석례일련번호",
                this::mapInterpretationDetail);
    }

    /** 공통 검색→상세 흐름 */
    private List<LawDocument> fetchDocuments(
            String target,
            String query,
            int display,
            String rootKey,
            String itemKey,
            String idKey,
            java.util.function.BiFunction<JsonNode, String, LawDocument> detailMapper
    ) {
        if (!properties.isConfigured()) {
            log.warn("[LawApi] OC 미설정 — {} {} 건너뜀", target, query);
            return List.of();
        }
        List<LawDocument> out = new ArrayList<>();
        try {
            URI searchUri = UriComponentsBuilder.fromHttpUrl(properties.baseUrl() + "/lawSearch.do")
                    .queryParam("OC", properties.oc())
                    .queryParam("target", target)
                    .queryParam("query", query)
                    .queryParam("search", "2")
                    .queryParam("type", "JSON")
                    .queryParam("display", display)
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();
            String response = restClient.get().uri(searchUri)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 (compatible; albasave)")
                    .retrieve().body(String.class);
            if (response == null || response.isBlank()) return List.of();

            JsonNode root = objectMapper.readTree(response).path(rootKey);
            JsonNode items = root.path(itemKey);
            if (!items.isArray() && items.isObject()) {
                items = objectMapper.createArrayNode().add(items);
            }
            if (!items.isArray()) return List.of();

            for (JsonNode item : items) {
                String externalId = textValue(item, idKey);
                if (externalId == null || externalId.isBlank()) continue;
                LawDocument doc = fetchDocumentDetail(target, externalId, detailMapper);
                if (doc != null) out.add(doc);
            }
            log.info("[LawApi] {} '{}' → {}건 적재", target, query, out.size());
        } catch (Exception e) {
            log.error("[LawApi] {} '{}' 실패: {}", target, query, e.getMessage());
        }
        return out;
    }

    private LawDocument fetchDocumentDetail(
            String target,
            String externalId,
            java.util.function.BiFunction<JsonNode, String, LawDocument> mapper
    ) {
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(properties.baseUrl() + "/lawService.do")
                    .queryParam("OC", properties.oc())
                    .queryParam("target", target)
                    .queryParam("ID", externalId)
                    .queryParam("type", "JSON")
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();
            String response = restClient.get().uri(uri)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 (compatible; albasave)")
                    .retrieve().body(String.class);
            if (response == null || response.isBlank()) return null;
            JsonNode root = objectMapper.readTree(response);
            // 응답 루트는 단일 객체이지만 key 이름이 다양 (예: "PrecService", "Expc")
            JsonNode payload = root.fields().hasNext() ? root.fields().next().getValue() : root;
            return mapper.apply(payload, externalId);
        } catch (Exception e) {
            log.warn("[LawApi] {} 상세 {} 실패: {}", target, externalId, e.getMessage());
            return null;
        }
    }

    private LawDocument mapPrecedentDetail(JsonNode payload, String externalId) {
        String content = stripHtml(textValue(payload, "판례내용"));
        String summary = joinNonBlank(
                stripHtml(textValue(payload, "판시사항")),
                stripHtml(textValue(payload, "판결요지"))
        );
        return new LawDocument(
                "PRECEDENT",
                externalId,
                textValue(payload, "사건명"),
                textValue(payload, "법원명"),
                textValue(payload, "선고일자"),
                textValue(payload, "참조조문"),
                summary,
                content
        );
    }

    private LawDocument mapInterpretationDetail(JsonNode payload, String externalId) {
        String content = stripHtml(textValue(payload, "이유"));
        String summary = stripHtml(textValue(payload, "질의요지"));
        return new LawDocument(
                "INTERPRETATION",
                externalId,
                textValue(payload, "안건명"),
                textValue(payload, "해석기관명") == null
                        ? textValue(payload, "회신기관명")
                        : textValue(payload, "해석기관명"),
                textValue(payload, "해석일자") == null
                        ? textValue(payload, "회신일자")
                        : textValue(payload, "해석일자"),
                null,
                summary,
                content
        );
    }

    private String stripHtml(String s) {
        if (s == null) return null;
        return s.replaceAll("<br\\s*/?>", "\n")
                .replaceAll("<[^>]+>", "")
                .replaceAll("&nbsp;", " ")
                .replaceAll("&amp;", "&")
                .replaceAll("&lt;", "<")
                .replaceAll("&gt;", ">")
                .replaceAll("[ \\t]+", " ")
                .trim();
    }

    private String joinNonBlank(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p == null || p.isBlank()) continue;
            if (sb.length() > 0) sb.append('\n');
            sb.append(p.trim());
        }
        return sb.length() == 0 ? null : sb.toString();
    }
}
