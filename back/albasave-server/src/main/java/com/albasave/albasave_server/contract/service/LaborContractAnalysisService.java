package com.albasave.albasave_server.contract.service;

import com.albasave.albasave_server.contract.domain.LaborContract;
import com.albasave.albasave_server.contract.dto.ContractAnalysisResponse;
import com.albasave.albasave_server.contract.dto.ContractViolation;
import com.albasave.albasave_server.contract.dto.ExtractedContractInfo;
import com.albasave.albasave_server.contract.repository.LaborContractRepository;
import com.albasave.albasave_server.global.config.AnthropicProperties;
import com.albasave.albasave_server.jobposting.config.OpenAiProperties;
import com.albasave.albasave_server.jobposting.service.JobPostingImageStorageService;
import com.albasave.albasave_server.report.service.WageCalculationService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class LaborContractAnalysisService {

    private final LaborContractRepository contractRepository;
    private final JobPostingImageStorageService imageStorageService;
    private final OpenAiProperties openAiProperties;
    private final AnthropicProperties anthropicProperties;
    private final ObjectMapper objectMapper;

    // ─────────────────────────────────────────────────────────────────
    //  분석
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public ContractAnalysisResponse analyzeContract(Long userId, MultipartFile image, Long partTimeJobId) {
        // 1. S3 업로드 (실패해도 분석은 계속)
        String imageUrl = imageStorageService.upload(image).orElse(null);

        // 2. OpenAI vision으로 계약서 분석
        String base64Image = encodeImage(image);
        String rawAnalysis = callOpenAi(base64Image);
        String cleanedJson = cleanJson(rawAnalysis);

        // 3. JSON 파싱
        ExtractedContractInfo extractedInfo = parseExtractedInfo(cleanedJson);
        List<ContractViolation> violations = new java.util.ArrayList<>(parseViolations(cleanedJson));
        String summary = parseSummary(cleanedJson);

        // 룰베이스 추가 검증 (OpenAI가 추출한 시급 정보 기반)
        violations.addAll(ruleBasedCheck(extractedInfo));
        boolean hasViolation = !violations.isEmpty();

        log.info("[계약서 분석 완료] userId={}, violations={}, hasViolation={}",
                userId, violations.size(), hasViolation);

        // 4. DB 저장
        LaborContract saved = contractRepository.save(LaborContract.builder()
                .userId(userId)
                .partTimeJobId(partTimeJobId)
                .imageUrl(imageUrl)
                .analysisJson(cleanedJson)
                .hasViolation(hasViolation)
                .build());

        return ContractAnalysisResponse.builder()
                .contractId(saved.getId())
                .hasViolation(hasViolation)
                .extractedInfo(extractedInfo)
                .violations(violations)
                .summary(summary)
                .minimumWage(WageCalculationService.MINIMUM_WAGE_2026)
                .imageUrl(imageUrl)
                .createdAt(saved.getCreatedAt())
                .build();
    }

    // ─────────────────────────────────────────────────────────────────
    //  이력 조회
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ContractAnalysisResponse> getHistory(Long userId) {
        return contractRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(c -> toResponse(c))
                .toList();
    }

    @Transactional(readOnly = true)
    public ContractAnalysisResponse getOne(Long userId, Long contractId) {
        LaborContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("분석 내역을 찾을 수 없습니다."));
        if (!contract.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 분석 내역만 조회할 수 있습니다.");
        }
        return toResponse(contract);
    }

    // ─────────────────────────────────────────────────────────────────
    //  OpenAI 호출
    // ─────────────────────────────────────────────────────────────────

    private String callOpenAi(String base64Image) {
        // Claude API 우선 시도
        if (anthropicProperties.isConfigured()) {
            String result = callClaude(base64Image);
            if (result != null) return result;
        }

        // OpenAI 폴백
        if (!openAiProperties.isConfigured()) {
            return buildUnavailableResponse("AI API Key가 설정되지 않았습니다. ANTHROPIC_API_KEY 또는 OPENAI_API_KEY를 설정해주세요.");
        }

        String prompt = buildPrompt();
        try {
            RestClient client = RestClient.create();
            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", openAiProperties.model(),
                    "messages", List.of(Map.of(
                            "role", "user",
                            "content", List.of(
                                    Map.of("type", "text", "text", prompt),
                                    Map.of("type", "image_url",
                                            "image_url", Map.of(
                                                    "url", "data:image/jpeg;base64," + base64Image,
                                                    "detail", "high"
                                            ))
                            )
                    )),
                    "max_tokens", 2000
            ));

            String response = client.post()
                    .uri(openAiProperties.baseUrl() + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiProperties.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode json = objectMapper.readTree(response);
            return json.path("choices").path(0).path("message").path("content").asText();

        } catch (Exception e) {
            String msg = e.getMessage();
            log.error("[계약서 분석 OpenAI 호출 실패] {}", msg);
            if (msg != null && msg.contains("insufficient_quota")) {
                return buildUnavailableResponse("OpenAI API 크레딧이 소진되었습니다. ANTHROPIC_API_KEY를 설정하거나 OpenAI 크레딧을 충전해주세요.");
            }
            return buildUnavailableResponse("AI 분석 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    /** Claude (Anthropic) API 호출 */
    private String callClaude(String base64Image) {
        try {
            RestClient client = RestClient.create();
            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", anthropicProperties.model(),
                    "max_tokens", 2000,
                    "messages", List.of(Map.of(
                            "role", "user",
                            "content", List.of(
                                    Map.of("type", "image",
                                            "source", Map.of(
                                                    "type", "base64",
                                                    "media_type", "image/jpeg",
                                                    "data", base64Image
                                            )),
                                    Map.of("type", "text", "text", buildPrompt())
                            )
                    ))
            ));

            String response = client.post()
                    .uri(anthropicProperties.baseUrl() + "/messages")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + anthropicProperties.apiKey())
                    .header("x-api-key", anthropicProperties.apiKey())
                    .header("anthropic-version", "2023-06-01")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode json = objectMapper.readTree(response);
            return json.path("content").path(0).path("text").asText();

        } catch (Exception e) {
            log.error("[계약서 분석 Claude 호출 실패] {}", e.getMessage());
            return null;
        }
    }

    private String buildPrompt() {
        return """
                당신은 한국 근로기준법 전문가입니다.
                첨부된 근로계약서 이미지를 분석하여 아래 JSON 형식으로만 응답하세요.
                JSON 외 다른 텍스트는 절대 포함하지 마세요.

                분석 기준 (2026년 기준):
                - 최저시급: 10,030원
                - 연장·야간·휴일 근로: 통상임금의 50%% 가산 (근로기준법 제56조)
                - 주휴수당: 1주 15시간 이상 근무 시 1일분 임금 추가 지급 (근로기준법 제55조)
                - 근로계약서 필수 기재사항 (근로기준법 제17조):
                  임금, 소정근로시간, 제55조 휴일, 제60조 연차유급휴가, 취업 장소, 업무 내용

                응답 형식:
                {
                  "extractedInfo": {
                    "hourlyWage": 시급(숫자) 또는 null,
                    "workingHoursPerDay": 1일 근로시간(숫자) 또는 null,
                    "workingDaysPerWeek": 주 근무일수(숫자) 또는 null,
                    "startDate": "근무 시작일 문자열" 또는 null,
                    "workPlace": "근무 장소" 또는 null,
                    "jobDescription": "업무 내용" 또는 null,
                    "weeklyHolidayAllowanceMentioned": true 또는 false,
                    "overtimeAllowanceMentioned": true 또는 false,
                    "annualLeaveMentioned": true 또는 false,
                    "employerName": "고용주 이름 또는 상호" 또는 null,
                    "businessRegistrationNumber": "사업자등록번호" 또는 null
                  },
                  "violations": [
                    {
                      "type": "위반 유형 (예: MINIMUM_WAGE / OVERTIME_PAY / WEEKLY_HOLIDAY / MANDATORY_ITEMS / WORKING_HOURS)",
                      "severity": "HIGH 또는 MEDIUM 또는 LOW",
                      "description": "구체적인 위반 내용 설명",
                      "legalBasis": "근로기준법 제XX조"
                    }
                  ],
                  "summary": "전체 분석 요약 (2~3문장)"
                }
                """;
    }

    // ─────────────────────────────────────────────────────────────────
    //  파싱 헬퍼
    // ─────────────────────────────────────────────────────────────────

    private String cleanJson(String raw) {
        String s = raw.trim();
        if (s.startsWith("```json")) s = s.substring(7);
        else if (s.startsWith("```")) s = s.substring(3);
        if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
        return s.trim();
    }

    private ExtractedContractInfo parseExtractedInfo(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode node = root.path("extractedInfo");
            if (!node.isMissingNode()) {
                return objectMapper.treeToValue(node, ExtractedContractInfo.class);
            }
        } catch (Exception e) {
            log.warn("[계약서 extractedInfo 파싱 실패] {}", e.getMessage());
        }
        return null;
    }

    private List<ContractViolation> parseViolations(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode node = root.path("violations");
            if (node.isArray()) {
                return objectMapper.convertValue(node, new TypeReference<>() {});
            }
        } catch (Exception e) {
            log.warn("[계약서 violations 파싱 실패] {}", e.getMessage());
        }
        return List.of();
    }

    private String parseSummary(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            String summary = root.path("summary").asText(null);
            return summary;
        } catch (Exception e) {
            return null;
        }
    }

    private ContractAnalysisResponse toResponse(LaborContract c) {
        String json = c.getAnalysisJson();
        String cleanedJson = json != null ? cleanJson(json) : null;

        ExtractedContractInfo info = cleanedJson != null ? parseExtractedInfo(cleanedJson) : null;
        List<ContractViolation> violations = cleanedJson != null ? parseViolations(cleanedJson) : List.of();
        String summary = cleanedJson != null ? parseSummary(cleanedJson) : null;

        return ContractAnalysisResponse.builder()
                .contractId(c.getId())
                .hasViolation(Boolean.TRUE.equals(c.getHasViolation()))
                .extractedInfo(info)
                .violations(violations)
                .summary(summary)
                .minimumWage(WageCalculationService.MINIMUM_WAGE_2026)
                .imageUrl(c.getImageUrl())
                .createdAt(c.getCreatedAt())
                .build();
    }

    private String encodeImage(MultipartFile file) {
        try {
            return Base64.getEncoder().encodeToString(file.getBytes());
        } catch (Exception e) {
            throw new RuntimeException("이미지 인코딩 실패", e);
        }
    }

    /**
     * OpenAI 없이도 판단 가능한 룰베이스 검증
     * extractedInfo에서 시급이 추출됐을 때 최저임금 위반 자동 감지
     */
    private List<ContractViolation> ruleBasedCheck(ExtractedContractInfo info) {
        List<ContractViolation> extra = new java.util.ArrayList<>();
        if (info == null) return extra;

        int minWage = WageCalculationService.MINIMUM_WAGE_2026;

        // 최저임금 위반
        if (info.getHourlyWage() != null && info.getHourlyWage() < minWage) {
            ContractViolation v = new ContractViolation();
            v.init("MINIMUM_WAGE", "HIGH",
                    String.format("계약 시급 %,d원이 2026년 최저시급 %,d원에 미달합니다.",
                            info.getHourlyWage(), minWage),
                    "근로기준법 제6조의2, 최저임금법 제6조");
            extra.add(v);
        }

        // 주휴수당 미언급
        if (Boolean.FALSE.equals(info.getWeeklyHolidayAllowanceMentioned())
                && info.getWorkingDaysPerWeek() != null && info.getWorkingDaysPerWeek() >= 3) {
            ContractViolation v = new ContractViolation();
            v.init("WEEKLY_HOLIDAY", "MEDIUM",
                    "주 15시간 이상 근무 시 주휴수당 지급 의무가 있으나 계약서에 명시되어 있지 않습니다.",
                    "근로기준법 제55조");
            extra.add(v);
        }

        // 연장수당 미언급
        if (Boolean.FALSE.equals(info.getOvertimeAllowanceMentioned())) {
            ContractViolation v = new ContractViolation();
            v.init("OVERTIME_PAY", "LOW",
                    "연장·야간·휴일 근로 시 가산수당(50%%) 지급 조항이 명시되어 있지 않습니다.",
                    "근로기준법 제56조");
            extra.add(v);
        }

        return extra;
    }

    private String buildUnavailableResponse(String reason) {
        return String.format("""
                {
                  "extractedInfo": null,
                  "violations": [],
                  "summary": "%s"
                }
                """, reason);
    }
}
