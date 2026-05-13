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

        ObjectNode request = buildRequest(image);
        String response = restClient.post()
                .uri("/responses")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + properties.apiKey())
                .body(request)
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
                너는 한국 아르바이트 구인공고 캡처를 분석하는 정보 추출기다.
                사용자는 이 결과를 업장 DB 매칭과 노동법 위험 문구 점검에 사용할 예정이다.

                원칙:
                - 이미지에 실제로 보이는 내용만 추출한다.
                - 추측이 필요한 값은 null 또는 빈 배열로 둔다.
                - 상호명, 브랜드명, 주소, 직무명, 시급, 근무요일, 근무시간, 복리후생, 공고 내 수상한 문구를 최대한 찾는다.
                - '급구', '당일지급', '수습', '주휴수당 포함', '협의', '벌금', '손해배상', '무단결근', '교육기간 무급'처럼 노동조건 불명확성이나 위법 소지가 있는 표현은 suspiciousPhrases에 넣는다.
                - missingInformation에는 휴게시간, 주휴수당, 4대보험, 계약기간, 정확한 근무시간처럼 이미지에서 확인되지 않는 중요한 항목을 넣는다.
                - hourlyWage는 숫자로 확정 가능할 때만 원 단위 정수로 넣는다.
                """;
    }

    private JsonNode extractionSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        ArrayNode required = schema.putArray("required");
        for (String field : new String[]{
                "businessName", "brandName", "address", "jobTitle", "industryHint",
                "hourlyWageText", "hourlyWage", "workScheduleText", "workDays",
                "workTimeText", "employmentType", "benefits", "suspiciousPhrases",
                "missingInformation", "rawSummary"
        }) {
            required.add(field);
        }

        ObjectNode propertiesNode = schema.putObject("properties");
        nullableString(propertiesNode, "businessName");
        nullableString(propertiesNode, "brandName");
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

    private String toDataUrl(MultipartFile image) throws IOException {
        String contentType = image.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = MediaType.IMAGE_JPEG_VALUE;
        }
        return "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(image.getBytes());
    }

    private Optional<String> findOutputText(JsonNode node) {
        if (node == null || node.isNull()) {
            return Optional.empty();
        }
        if (node.isTextual()) {
            return Optional.empty();
        }
        if (node.isObject()) {
            String type = node.path("type").asText();
            if ("output_text".equals(type) && node.has("text")) {
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
