package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.config.OpenAiProperties;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;

@Component
public class OpenAiJobPostingExtractor {
    private final OpenAiProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public OpenAiJobPostingExtractor(OpenAiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .build();
    }

    public Optional<ExtractedJobPosting> extract(MultipartFile image) throws IOException {
        if (!properties.isConfigured()) {
            return Optional.empty();
        }

        String response = restClient.post()
                .uri("/responses")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + properties.apiKey())
                .body(buildRequest(image))
                .retrieve()
                .body(String.class);

        String jsonText = findOutputText(objectMapper.readTree(response))
                .orElseThrow(() -> new IllegalStateException("OpenAI response did not include output_text."));

        return Optional.of(objectMapper.readValue(jsonText, ExtractedJobPosting.class));
    }

    private ObjectNode buildRequest(MultipartFile image) throws IOException {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", properties.model());

        ArrayNode input = root.putArray("input");
        ObjectNode message = input.addObject();
        message.put("role", "user");

        ArrayNode content = message.putArray("content");
        content.addObject()
                .put("type", "input_text")
                .put("text", extractionPrompt());
        content.addObject()
                .put("type", "input_image")
                .put("image_url", toDataUrl(image))
                .put("detail", "high");

        ObjectNode text = root.putObject("text");
        ObjectNode format = text.putObject("format");
        format.put("type", "json_schema");
        format.put("name", "job_posting_extraction");
        format.put("strict", true);
        format.set("schema", extractionSchema());

        return root;
    }

    private String extractionPrompt() {
        return """
                너는 한국 아르바이트 구인공고 캡처 이미지를 분석하는 노동법·정보 분석가다.
                결과는 업장 DB 매칭, 임금/노동조건 위험 문구 탐지, 공공데이터 비교, 사용자 위험 안내에 사용된다.

                [A. 정보 추출 원칙]
                - 이미지에 실제로 보이는 내용만 추출한다. 추측 금지.
                - 확실하지 않은 값은 null 또는 빈 배열로 둔다.
                - 사업장명, 브랜드명, 사업자등록번호, 전화번호, 주소, 직무명,
                  시급, 근무요일, 근무시간, 복리후생을 최대한 찾는다.
                - 사업자등록번호는 000-00-00000 형태가 보이면 하이픈 없이 숫자 10자리로 반환한다.
                - 전화번호는 대표번호/채용담당자/매장번호 중 DB 매칭에 유용한 값을 반환한다.
                - '주휴수당 포함', '협의', '벌금', '손해배상', '위약금', '무단결근',
                  '교육기간 무급', '급구', '당일지급'처럼 노동조건이 불명확하거나
                  위법 소지가 있는 표현은 suspiciousPhrases에 원문 그대로 넣는다.
                - missingInformation에는 휴게시간/주휴수당/4대보험/계약기간/정확한 근무시간처럼
                  이미지에서 확인되지 않는 중요 항목을 넣는다.
                - hourlyWage는 숫자로 확정 가능할 때만 원 단위 정수로 넣는다.

                [B. 법적 위반 가능성 직접 판단 — llmConcerns]
                추출이 끝났으면 추출된 내용 자체를 바탕으로 한국 근로기준법 위반 가능성을
                직접 판단해서 llmConcerns 배열에 넣어라. 다음 기준을 사용한다.
                  · 최저시급 2026년 10,030원 미달 → category: "WAGE", severity: "HIGH"
                  · 주휴수당 포함 표기인데 시급이 최저임금 수준이면 실질 미달 의심 →
                    category: "WAGE", severity: "MEDIUM"
                  · 위약금/손해배상/벌금 예정 조항 (근로기준법 제20조 위반 소지) →
                    category: "PENALTY", severity: "HIGH"
                  · 무단결근 시 임금 미지급 위협, 교육기간 무급 → category: "CONDITION", severity: "MEDIUM"
                  · 휴게시간 미언급이면서 1일 4시간 이상 근무 → category: "ALLOWANCE", severity: "LOW"
                  · 근무시간이 1일 8시간 또는 주 40시간 초과인데 가산수당 언급 없음 →
                    category: "ALLOWANCE", severity: "MEDIUM"
                  · 계약서 미작성/당일채용 같은 표현 → category: "CONTRACT", severity: "MEDIUM"
                  · '급구', '면접시 협의'처럼 채용 강요/조건 불명확 → category: "POSTING_PATTERN", severity: "LOW"
                  · 그 외 노동법 위반 또는 의심 → category: "OTHER", severity 적절히
                각 항목은 반드시 evidence에 공고 원문에서 인용한 짧은 문구(20자 이내)를 함께 적는다.
                근거가 약한 추측은 넣지 않는다. 위반이 발견되지 않으면 빈 배열로 둔다.

                [C. overallAssessment]
                위 분석을 종합해 "지원해도 무방" / "조건 확인 후 지원 권장" / "지원 비권장 — 명백한 위법 신호"
                중 하나의 한국어 한 줄 평가를 overallAssessment에 넣는다.

                [D. rawSummary]
                전체 공고 내용을 2~3문장으로 한국어 요약한다.
                """;
    }

    private JsonNode extractionSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        ArrayNode required = schema.putArray("required");
        for (String field : new String[]{
                "businessName", "brandName", "businessRegistrationNumber", "phone", "address",
                "jobTitle", "industryHint", "hourlyWageText", "hourlyWage", "workScheduleText",
                "workDays", "workTimeText", "employmentType", "benefits", "suspiciousPhrases",
                "missingInformation", "llmConcerns", "overallAssessment", "rawSummary"
        }) {
            required.add(field);
        }

        ObjectNode propertiesNode = schema.putObject("properties");
        nullableString(propertiesNode, "businessName");
        nullableString(propertiesNode, "brandName");
        nullableString(propertiesNode, "businessRegistrationNumber");
        nullableString(propertiesNode, "phone");
        nullableString(propertiesNode, "address");
        nullableString(propertiesNode, "jobTitle");
        nullableString(propertiesNode, "industryHint");
        nullableString(propertiesNode, "hourlyWageText");
        nullableInteger(propertiesNode, "hourlyWage");
        nullableString(propertiesNode, "workScheduleText");
        stringArray(propertiesNode, "workDays");
        nullableString(propertiesNode, "workTimeText");
        nullableString(propertiesNode, "employmentType");
        stringArray(propertiesNode, "benefits");
        stringArray(propertiesNode, "suspiciousPhrases");
        stringArray(propertiesNode, "missingInformation");
        llmConcernsArray(propertiesNode, "llmConcerns");
        nullableString(propertiesNode, "overallAssessment");
        nullableString(propertiesNode, "rawSummary");

        return schema;
    }

    private void nullableString(ObjectNode propertiesNode, String name) {
        ObjectNode node = propertiesNode.putObject(name);
        ArrayNode type = node.putArray("type");
        type.add("string");
        type.add("null");
    }

    private void nullableInteger(ObjectNode propertiesNode, String name) {
        ObjectNode node = propertiesNode.putObject(name);
        ArrayNode type = node.putArray("type");
        type.add("integer");
        type.add("null");
    }

    private void stringArray(ObjectNode propertiesNode, String name) {
        ObjectNode node = propertiesNode.putObject(name);
        node.put("type", "array");
        node.putObject("items").put("type", "string");
    }

    private void llmConcernsArray(ObjectNode propertiesNode, String name) {
        ObjectNode arr = propertiesNode.putObject(name);
        arr.put("type", "array");

        ObjectNode item = arr.putObject("items");
        item.put("type", "object");
        item.put("additionalProperties", false);
        ArrayNode req = item.putArray("required");
        for (String f : new String[]{"category", "severity", "title", "description", "evidence"}) {
            req.add(f);
        }
        ObjectNode props = item.putObject("properties");

        ObjectNode category = props.putObject("category");
        category.put("type", "string");
        ArrayNode catEnum = category.putArray("enum");
        for (String c : new String[]{
                "WAGE", "ALLOWANCE", "CONDITION", "PENALTY", "CONTRACT", "POSTING_PATTERN", "OTHER"
        }) {
            catEnum.add(c);
        }

        ObjectNode severity = props.putObject("severity");
        severity.put("type", "string");
        ArrayNode sevEnum = severity.putArray("enum");
        for (String s : new String[]{"HIGH", "MEDIUM", "LOW"}) {
            sevEnum.add(s);
        }

        props.putObject("title").put("type", "string");
        props.putObject("description").put("type", "string");
        nullableString(props, "evidence");
    }

    private String toDataUrl(MultipartFile image) throws IOException {
        String contentType = image.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = MediaType.IMAGE_JPEG_VALUE;
        }
        return "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(image.getBytes());
    }

    private Optional<String> findOutputText(JsonNode node) {
        if (node == null || node.isNull() || node.isTextual()) {
            return Optional.empty();
        }
        if (node.isObject()) {
            if ("output_text".equals(node.path("type").asText()) && node.has("text")) {
                return Optional.of(node.path("text").asText());
            }
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Optional<String> found = findOutputText(fields.next().getValue());
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                Optional<String> found = findOutputText(child);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        return Optional.empty();
    }
}
