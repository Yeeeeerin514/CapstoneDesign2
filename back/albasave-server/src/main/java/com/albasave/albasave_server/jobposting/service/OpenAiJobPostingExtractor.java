package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.config.OpenAiProperties;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import com.albasave.albasave_server.jobposting.dto.LlmConcern;
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
import java.util.List;
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

    private static final int CHUNK_HEIGHT = 4096;

    public Optional<ExtractedJobPosting> extract(MultipartFile image) throws IOException {
        if (!properties.isConfigured()) {
            return Optional.empty();
        }

        org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(OpenAiJobPostingExtractor.class);
        byte[] originalBytes = image.getBytes();
        String contentType = (image.getContentType() == null || image.getContentType().isBlank())
                ? MediaType.IMAGE_JPEG_VALUE
                : image.getContentType();

        // 진단: 입력 이미지 메타 로그
        logImageMeta(image, originalBytes, log);

        // 이미지 디코딩 후 세로 길이 확인
        java.awt.image.BufferedImage src = null;
        try (java.io.ByteArrayInputStream bis = new java.io.ByteArrayInputStream(originalBytes)) {
            src = javax.imageio.ImageIO.read(bis);
        } catch (Exception e) {
            log.warn("[OpenAI 이미지 디코딩 실패] {} — 분할 없이 원본 그대로 호출", e.getMessage());
        }

        // 분할 불필요 케이스: 짧은 이미지 또는 디코딩 실패
        if (src == null || src.getHeight() <= CHUNK_HEIGHT) {
            ExtractedJobPosting one = callOpenAi(originalBytes, contentType, log);
            return Optional.of(one);
        }

        // 분할 + 합산
        List<byte[]> chunks = splitImageToJpegChunks(src, CHUNK_HEIGHT);
        log.info("[OpenAI 이미지 분할] 원본 {}x{} → {}개 청크 (각 ≤{}px)",
                src.getWidth(), src.getHeight(), chunks.size(), CHUNK_HEIGHT);

        List<ExtractedJobPosting> extracts = new java.util.ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            try {
                ExtractedJobPosting e = callOpenAi(chunks.get(i), MediaType.IMAGE_JPEG_VALUE, log);
                log.info("[OpenAI 청크 {}/{}] businessName={}, hourlyWage={}",
                        i + 1, chunks.size(), e.businessName(), e.hourlyWage());
                extracts.add(e);
            } catch (Exception ex) {
                log.warn("[OpenAI 청크 {}/{}] 실패: {}", i + 1, chunks.size(), ex.getMessage());
            }
        }

        if (extracts.isEmpty()) {
            return Optional.empty();
        }

        ExtractedJobPosting merged = mergeExtracts(extracts);
        log.info("[OpenAI 합산 결과] businessName={}, hourlyWage={}, missing={}",
                merged.businessName(), merged.hourlyWage(),
                merged.missingInformation() == null ? 0 : merged.missingInformation().size());
        return Optional.of(merged);
    }

    private void logImageMeta(MultipartFile image, byte[] bytes, org.slf4j.Logger log) {
        try {
            String hash = java.util.HexFormat.of().formatHex(
                    java.security.MessageDigest.getInstance("SHA-256").digest(bytes)
            ).substring(0, 16);
            int width = -1, height = -1;
            try (java.io.ByteArrayInputStream bis = new java.io.ByteArrayInputStream(bytes)) {
                java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(bis);
                if (img != null) {
                    width = img.getWidth();
                    height = img.getHeight();
                }
            } catch (Exception ignored) {
            }
            log.info("[OpenAI 입력 이미지] name={}, contentType={}, size={}KB, dimensions={}x{}, sha256={}…",
                    image.getOriginalFilename(),
                    image.getContentType(),
                    bytes.length / 1024,
                    width, height,
                    hash);
        } catch (Exception ignored) {
        }
    }

    private ExtractedJobPosting callOpenAi(byte[] bytes, String contentType, org.slf4j.Logger log) throws IOException {
        String response = restClient.post()
                .uri("/responses")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + properties.apiKey())
                .body(buildRequestForBytes(bytes, contentType))
                .retrieve()
                .body(String.class);

        String jsonText = findOutputText(objectMapper.readTree(response))
                .orElseThrow(() -> new IllegalStateException("OpenAI response did not include output_text."));
        log.info("[OpenAI 공고 추출 raw] {}", jsonText);
        return objectMapper.readValue(jsonText, ExtractedJobPosting.class);
    }

    private ObjectNode buildRequestForBytes(byte[] bytes, String contentType) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", properties.model());
        root.put("temperature", 0);

        ArrayNode input = root.putArray("input");
        ObjectNode message = input.addObject();
        message.put("role", "user");

        ArrayNode content = message.putArray("content");
        content.addObject()
                .put("type", "input_text")
                .put("text", extractionPrompt());
        String dataUrl = "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(bytes);
        content.addObject()
                .put("type", "input_image")
                .put("image_url", dataUrl)
                .put("detail", "high");

        ObjectNode text = root.putObject("text");
        ObjectNode format = text.putObject("format");
        format.put("type", "json_schema");
        format.put("name", "job_posting_extraction");
        format.put("strict", true);
        format.set("schema", extractionSchema());

        return root;
    }

    /** 세로 길이가 chunkHeight 초과인 BufferedImage를 chunkHeight 단위로 분할해 JPEG 바이트 리스트 반환. */
    private List<byte[]> splitImageToJpegChunks(java.awt.image.BufferedImage src, int chunkHeight) throws IOException {
        int width = src.getWidth();
        int total = src.getHeight();
        List<byte[]> chunks = new java.util.ArrayList<>();
        for (int y = 0; y < total; y += chunkHeight) {
            int h = Math.min(chunkHeight, total - y);
            java.awt.image.BufferedImage sub = src.getSubimage(0, y, width, h);
            // PNG with alpha → RGB로 변환해야 JPEG 저장 가능
            java.awt.image.BufferedImage rgb = new java.awt.image.BufferedImage(
                    width, h, java.awt.image.BufferedImage.TYPE_INT_RGB);
            rgb.getGraphics().drawImage(sub, 0, 0, null);
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(rgb, "JPEG", out);
            chunks.add(out.toByteArray());
        }
        return chunks;
    }

    /**
     * 분할된 청크별 추출 결과를 하나로 합산.
     * - 단일 필드 (businessName, phone 등): 첫 번째 non-null
     * - 배열 (workDays, benefits, missingInformation 등): 합집합 (중복 제거)
     * - llmConcerns: title 기준 중복 제거 후 합집합
     * - rawSummary: 청크별 요약 결합
     */
    private ExtractedJobPosting mergeExtracts(List<ExtractedJobPosting> list) {
        return new ExtractedJobPosting(
                firstNonBlank(list, ExtractedJobPosting::businessName),
                firstNonBlank(list, ExtractedJobPosting::brandName),
                firstNonBlank(list, ExtractedJobPosting::businessRegistrationNumber),
                firstNonBlank(list, ExtractedJobPosting::phone),
                firstNonBlank(list, ExtractedJobPosting::address),
                firstNonBlank(list, ExtractedJobPosting::jobTitle),
                firstNonBlank(list, ExtractedJobPosting::industryHint),
                firstNonBlank(list, ExtractedJobPosting::hourlyWageText),
                firstNonNullObj(list, ExtractedJobPosting::hourlyWage),
                firstNonBlank(list, ExtractedJobPosting::workScheduleText),
                unionStrings(list, ExtractedJobPosting::workDays),
                firstNonBlank(list, ExtractedJobPosting::workTimeText),
                firstNonBlank(list, ExtractedJobPosting::contractPeriod),
                firstNonBlank(list, ExtractedJobPosting::employmentType),
                unionStrings(list, ExtractedJobPosting::benefits),
                unionStrings(list, ExtractedJobPosting::suspiciousPhrases),
                intersectionMissing(list),
                unionLlmConcerns(list),
                firstNonBlank(list, ExtractedJobPosting::overallAssessment),
                joinSummaries(list)
        );
    }

    private String firstNonBlank(List<ExtractedJobPosting> list,
                                  java.util.function.Function<ExtractedJobPosting, String> getter) {
        return list.stream().map(getter).filter(v -> v != null && !v.isBlank()).findFirst().orElse(null);
    }

    private <T> T firstNonNullObj(List<ExtractedJobPosting> list,
                                   java.util.function.Function<ExtractedJobPosting, T> getter) {
        return list.stream().map(getter).filter(java.util.Objects::nonNull).findFirst().orElse(null);
    }

    private List<String> unionStrings(List<ExtractedJobPosting> list,
                                       java.util.function.Function<ExtractedJobPosting, List<String>> getter) {
        return list.stream()
                .map(getter)
                .filter(java.util.Objects::nonNull)
                .flatMap(List::stream)
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .toList();
    }

    /**
     * missingInformation은 union이 아니라 **교집합**.
     * 한 청크에서 "주휴수당"이 보여 missing이 아니어도, 다른 청크에선 안 보여서 missing으로 잡힐 수 있음.
     * 즉 모든 청크에서 일관되게 누락인 항목만 진짜 누락.
     */
    private List<String> intersectionMissing(List<ExtractedJobPosting> list) {
        java.util.Set<String> first = null;
        for (ExtractedJobPosting e : list) {
            java.util.Set<String> current = new java.util.HashSet<>();
            if (e.missingInformation() != null) {
                e.missingInformation().stream().filter(s -> s != null && !s.isBlank()).forEach(current::add);
            }
            if (first == null) first = current;
            else first.retainAll(current);
        }
        if (first == null) return List.of();
        return first.stream().sorted().toList();
    }

    private List<LlmConcern> unionLlmConcerns(List<ExtractedJobPosting> list) {
        java.util.Map<String, LlmConcern> byTitle = new java.util.LinkedHashMap<>();
        for (ExtractedJobPosting e : list) {
            if (e.llmConcerns() == null) continue;
            for (LlmConcern c : e.llmConcerns()) {
                if (c == null || c.title() == null) continue;
                byTitle.putIfAbsent(c.title(), c);
            }
        }
        return new java.util.ArrayList<>(byTitle.values());
    }

    private String joinSummaries(List<ExtractedJobPosting> list) {
        StringBuilder sb = new StringBuilder();
        for (ExtractedJobPosting e : list) {
            if (e.rawSummary() != null && !e.rawSummary().isBlank()) {
                if (sb.length() > 0) sb.append(' ');
                sb.append(e.rawSummary());
            }
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    private String extractionPrompt() {
        return """
                너는 한국 아르바이트 구인공고 캡처를 분석하는 노동법·정보 분석가다.
                결과는 업장 DB 매칭, 위험 문구 탐지, 공공데이터 비교에 사용된다.

                [최우선 원칙]
                · 이미지에 보이는 텍스트만 추출. 못 읽으면 null/빈 배열.
                · 한 필드를 못 읽었다고 다른 필드를 일반적 값으로 채우지 마라.
                · 사업장명·전화·주소를 모를 때 절대 한국 알바 평균값으로 채우지 마라
                  (특히 "1234-5678", "테헤란로 123" 같은 dummy 금지).

                [필드별 가이드]
                · businessName/brandName: 이미지의 한글 글자 그대로. 유명 브랜드로 임의 대체 금지.
                · businessRegistrationNumber: 10자리 숫자 보이면 하이픈 제거, 없으면 null.
                · phone: 보이는 그대로. 마지막 자리까지 신중히 (9/2, 0/6 혼동 주의).
                · address: 도로명/지번 보이는 그대로 (층/호수 포함).
                · hourlyWage: "시급 N원"이 명시될 때만 그 숫자.
                  월급/일급/협의면 null + hourlyWageText에 원문. **흔한 시급값으로 채우지 마라.**
                · workTimeText: "HH:MM~HH:MM" 보이는 그대로. 여러 시간대면 콤마 연결.
                · contractPeriod: "근무기간/계약기간/N개월/N년" 표현 보이면 원문, 없으면 null.
                · workDays: 명시된 요일만. "월~금"이면 5개. 토/일 명시 없으면 추가 금지.
                · benefits: 이미지에 명시된 항목만 (없는 항목 추가 금지).
                · suspiciousPhrases: '주휴수당 포함', '협의', '벌금', '손해배상', '위약금',
                  '무단결근', '교육기간 무급', '급구', '당일지급' 등이 보이면 원문 그대로.
                · missingInformation: 안 보이는 중요 항목만 한국어로.
                  동의어 매핑 필수 — "근무기간"=계약기간, "주휴"=주휴수당, "휴게"=휴게시간, "보험"=4대보험.
                  매핑 항목이 보이면 missing에 넣지 마라.

                [llmConcerns — 위법 가능성 직접 판단]
                추출 결과로 한국 근로기준법 위반 가능성을 판단해 배열에 넣어라.
                각 항목은 evidence에 이미지 원문 인용 짧은 문구(20자 이내) 필수. 인용 불가능하면 제외.
                  · 최저시급 2026년 10,030원 미달 → WAGE/HIGH
                  · 주휴수당 포함 표기 + 시급이 최저임금 수준 → WAGE/MEDIUM
                  · 위약금/손해배상/벌금 약정 (근로기준법 제20조) → PENALTY/HIGH
                  · 무단결근 시 임금 미지급 위협, 교육기간 무급 → CONDITION/MEDIUM
                  · 휴게시간 미언급 + 1일 4시간 이상 근무 → ALLOWANCE/LOW
                  · 1일 8시간 / 주 40시간 초과인데 가산수당 미언급 → ALLOWANCE/MEDIUM
                  · 계약서 미작성/당일채용 → CONTRACT/MEDIUM
                  · '급구'/'면접시 협의' 등 조건 불명확 → POSTING_PATTERN/LOW
                위반 없으면 빈 배열.

                [overallAssessment]
                "지원해도 무방" / "조건 확인 후 지원 권장" / "지원 비권장 — 명백한 위법 신호" 중 하나.

                [rawSummary]
                전체 공고 2~3문장 한국어 요약. 못 읽었으면 짧게.
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
                "workDays", "workTimeText", "contractPeriod", "employmentType", "benefits",
                "suspiciousPhrases", "missingInformation", "llmConcerns", "overallAssessment",
                "rawSummary"
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
        nullableString(propertiesNode, "contractPeriod");
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
