package com.albasave.albasave_server.contract.service;

import com.albasave.albasave_server.contract.domain.LaborContract;
import com.albasave.albasave_server.contract.dto.ContractAnalysisResponse;
import com.albasave.albasave_server.contract.dto.ContractFactSheet;
import com.albasave.albasave_server.contract.dto.ContractViolation;
import com.albasave.albasave_server.contract.dto.ExtractedContractInfo;
import com.albasave.albasave_server.contract.repository.LaborContractRepository;
import com.albasave.albasave_server.jobposting.config.OpenAiProperties;
import com.albasave.albasave_server.jobposting.service.JobPostingImageStorageService;
import com.albasave.albasave_server.lawapi.dto.LawArticle;
import com.albasave.albasave_server.lawapi.service.LegalContextService;
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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
    private final ObjectMapper objectMapper;
    private final LegalContextService legalContextService;

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

        // RAG Phase A: 각 violation에 법제처 API에서 받은 조문 본문 자동 첨부
        for (ContractViolation v : violations) {
            legalContextService.findArticleForViolation(v.getType())
                    .map(this::formatArticleExcerpt)
                    .ifPresent(v::setLegalBasisExcerpt);
        }

        boolean hasViolation = !violations.isEmpty();

        log.info("[계약서 분석 완료] userId={}, violations={}, hasViolation={}",
                userId, violations.size(), hasViolation);

        // 4. 진정서용 정형 데이터(타입 변환) 생성
        ContractFactSheet factSheet = buildFactSheet(extractedInfo);

        // 5. DB 저장: 룰베이스 + RAG enrich 완료된 합산 결과를 통째로 저장
        //    + 진정서 작성용 정형 컬럼들 직접 영속
        String persistedJson = serializePersistedAnalysis(extractedInfo, violations, summary);

        LaborContract saved = contractRepository.save(LaborContract.builder()
                .userId(userId)
                .partTimeJobId(partTimeJobId)
                .imageUrl(imageUrl)
                .analysisJson(persistedJson)
                .hasViolation(hasViolation)
                .businessRegistrationNumber(factSheet.businessRegistrationNumber())
                .workDays(factSheet.workDays())
                .workStartTime(factSheet.workStartTime())
                .workEndTime(factSheet.workEndTime())
                .employmentStartDate(factSheet.employmentStartDate())
                .hourlyWage(factSheet.hourlyWage())
                .minimumWageAtAnalysis(factSheet.minimumWage())
                .build());

        return ContractAnalysisResponse.builder()
                .contractId(saved.getId())
                .hasViolation(hasViolation)
                .extractedInfo(extractedInfo)
                .violations(violations)
                .summary(summary)
                .minimumWage(WageCalculationService.MINIMUM_WAGE_2026)
                .imageUrl(imageUrl)
                .factSheet(factSheet)
                .createdAt(saved.getCreatedAt())
                .build();
    }

    /** ExtractedContractInfo의 String/숫자 값들을 진정서가 바로 쓰는 타입으로 변환. */
    private ContractFactSheet buildFactSheet(ExtractedContractInfo info) {
        if (info == null) {
            return new ContractFactSheet(
                    null, new ArrayList<>(), null, null, null,
                    null, WageCalculationService.MINIMUM_WAGE_2026
            );
        }
        return new ContractFactSheet(
                normalizeBrNumber(info.getBusinessRegistrationNumber()),
                parseWorkDays(info.getWorkDays()),
                parseLocalTime(info.getWorkStartTime()),
                parseLocalTime(info.getWorkEndTime()),
                parseLocalDate(info.getEmploymentStartDate(), info.getStartDate()),
                info.getHourlyWage(),
                WageCalculationService.MINIMUM_WAGE_2026
        );
    }

    private String normalizeBrNumber(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("[^0-9]", "");
        return digits.isBlank() ? null : digits;
    }

    private List<DayOfWeek> parseWorkDays(List<String> raws) {
        List<DayOfWeek> out = new ArrayList<>();
        if (raws == null) return out;
        for (String r : raws) {
            if (r == null) continue;
            try {
                out.add(DayOfWeek.valueOf(r.trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {
                DayOfWeek mapped = mapKoreanDay(r.trim());
                if (mapped != null) out.add(mapped);
            }
        }
        return out;
    }

    private DayOfWeek mapKoreanDay(String s) {
        return switch (s) {
            case "월", "월요일" -> DayOfWeek.MONDAY;
            case "화", "화요일" -> DayOfWeek.TUESDAY;
            case "수", "수요일" -> DayOfWeek.WEDNESDAY;
            case "목", "목요일" -> DayOfWeek.THURSDAY;
            case "금", "금요일" -> DayOfWeek.FRIDAY;
            case "토", "토요일" -> DayOfWeek.SATURDAY;
            case "일", "일요일" -> DayOfWeek.SUNDAY;
            default -> null;
        };
    }

    private LocalTime parseLocalTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalTime.parse(raw.trim(), DateTimeFormatter.ofPattern("HH:mm"));
        } catch (Exception e) {
            try {
                return LocalTime.parse(raw.trim());
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    private LocalDate parseLocalDate(String iso, String fallback) {
        if (iso != null && !iso.isBlank()) {
            try { return LocalDate.parse(iso.trim()); } catch (Exception ignored) {}
        }
        if (fallback != null && !fallback.isBlank()) {
            // "2026년 4월 1일" 형식 변환 시도
            String compact = fallback.replaceAll("[^0-9]", "-").replaceAll("-+", "-");
            String[] parts = compact.split("-");
            if (parts.length >= 3) {
                try {
                    int y = Integer.parseInt(parts[0]);
                    int m = Integer.parseInt(parts[1]);
                    int d = Integer.parseInt(parts[2]);
                    return LocalDate.of(y, m, d);
                } catch (Exception ignored) {}
            }
        }
        return null;
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
        if (!openAiProperties.isConfigured()) {
            return buildUnavailableResponse("OPENAI_API_KEY가 설정되지 않았습니다.");
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
                return buildUnavailableResponse("OpenAI API 크레딧이 소진되었습니다. 크레딧을 충전해주세요.");
            }
            return buildUnavailableResponse("AI 분석 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
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

                추출 규칙(중요):
                - businessRegistrationNumber는 하이픈 제거 후 숫자 10자리만 반환.
                - workDays는 영어 풀네임 대문자 배열로 반환:
                    ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"] 중 해당하는 것만.
                    한글 '월~금' 같은 범위 표현이 보이면 해당 요일들을 모두 포함시킨다.
                    확인 불가하면 빈 배열 [].
                - workStartTime / workEndTime은 "HH:mm" 24시간 형식 문자열. 확인 불가 시 null.
                  '오전 9시'는 "09:00", '오후 6시'는 "18:00"로 정규화.
                - employmentStartDate는 "yyyy-MM-dd" ISO 형식. 확인 불가 시 null.
                  '2026년 4월 1일'은 "2026-04-01"로 정규화.

                응답 형식:
                {
                  "extractedInfo": {
                    "hourlyWage": 시급(숫자) 또는 null,
                    "workingHoursPerDay": 1일 근로시간(숫자) 또는 null,
                    "workingDaysPerWeek": 주 근무일수(숫자) 또는 null,
                    "startDate": "근무 시작일 원본 문자열" 또는 null,
                    "workPlace": "근무 장소" 또는 null,
                    "jobDescription": "업무 내용" 또는 null,
                    "weeklyHolidayAllowanceMentioned": true 또는 false,
                    "overtimeAllowanceMentioned": true 또는 false,
                    "annualLeaveMentioned": true 또는 false,
                    "employerName": "고용주 이름 또는 상호" 또는 null,
                    "businessRegistrationNumber": "사업자등록번호 10자리 숫자" 또는 null,
                    "workDays": ["MONDAY", ...] 또는 [],
                    "workStartTime": "HH:mm" 또는 null,
                    "workEndTime": "HH:mm" 또는 null,
                    "employmentStartDate": "yyyy-MM-dd" 또는 null
                  },
                  "violations": [
                    {
                      "type": "MINIMUM_WAGE / OVERTIME_PAY / WEEKLY_HOLIDAY / MANDATORY_ITEMS / WORKING_HOURS / REST_TIME / ANNUAL_LEAVE",
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
        List<ContractViolation> violations = cleanedJson != null
                ? new java.util.ArrayList<>(parseViolations(cleanedJson))
                : new java.util.ArrayList<>();
        String summary = cleanedJson != null ? parseSummary(cleanedJson) : null;

        // 이력 조회 시에도 RAG 컨텍스트 재첨부
        for (ContractViolation v : violations) {
            legalContextService.findArticleForViolation(v.getType())
                    .map(this::formatArticleExcerpt)
                    .ifPresent(v::setLegalBasisExcerpt);
        }

        // 진정서용 정형 데이터는 엔티티 컬럼에서 직접 복원 (재파싱 불필요)
        ContractFactSheet factSheet = new ContractFactSheet(
                c.getBusinessRegistrationNumber(),
                c.getWorkDays() == null ? new ArrayList<>() : c.getWorkDays(),
                c.getWorkStartTime(),
                c.getWorkEndTime(),
                c.getEmploymentStartDate(),
                c.getHourlyWage(),
                c.getMinimumWageAtAnalysis() != null
                        ? c.getMinimumWageAtAnalysis()
                        : WageCalculationService.MINIMUM_WAGE_2026
        );

        return ContractAnalysisResponse.builder()
                .contractId(c.getId())
                .hasViolation(Boolean.TRUE.equals(c.getHasViolation()))
                .extractedInfo(info)
                .factSheet(factSheet)
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

        // 주 총 근로시간 계산
        Double hpd = info.getWorkingHoursPerDay();
        Integer dpw = info.getWorkingDaysPerWeek();
        double weeklyHours = hpd != null && dpw != null ? hpd * dpw : -1;

        // 주휴수당: 주 15시간 이상 근무 시 의무
        if (Boolean.FALSE.equals(info.getWeeklyHolidayAllowanceMentioned())
                && weeklyHours >= 15) {
            ContractViolation v = new ContractViolation();
            v.init("WEEKLY_HOLIDAY", "MEDIUM",
                    String.format("주 %.1f시간 근무 조건이라 주휴수당 지급 의무가 발생하지만, 계약서에 명시되어 있지 않습니다.",
                            weeklyHours),
                    "근로기준법 제55조");
            extra.add(v);
        }

        // 연장수당: 일 8시간 초과 또는 주 40시간 초과 시 가산수당 의무
        boolean overtimePossible =
                (hpd != null && hpd > 8) || (weeklyHours > 40);
        if (Boolean.FALSE.equals(info.getOvertimeAllowanceMentioned())) {
            String severity = overtimePossible ? "MEDIUM" : "LOW";
            String desc = overtimePossible
                    ? String.format("일 %.1f시간 / 주 %.1f시간 근무 조건은 연장근로가 발생하므로 가산수당(50%%) 조항이 반드시 필요합니다.",
                            hpd == null ? 0 : hpd, weeklyHours)
                    : "연장·야간·휴일 근로 시 가산수당(50%) 지급 조항이 명시되어 있지 않습니다.";
            ContractViolation v = new ContractViolation();
            v.init("OVERTIME_PAY", severity, desc, "근로기준법 제56조");
            extra.add(v);
        }

        // 휴게시간: 일 4시간 이상이면 30분, 8시간 이상이면 1시간 휴게 의무
        if (hpd != null && hpd >= 4) {
            String required = hpd >= 8 ? "1시간" : "30분";
            ContractViolation v = new ContractViolation();
            v.init("REST_TIME", "LOW",
                    String.format("일 %.1f시간 근무라면 근로시간 도중 %s 이상의 휴게시간을 부여해야 합니다. 계약서에서 휴게시간 명시 여부를 다시 확인하세요.",
                            hpd, required),
                    "근로기준법 제54조");
            extra.add(v);
        }

        // 연차유급휴가
        if (Boolean.FALSE.equals(info.getAnnualLeaveMentioned()) && weeklyHours >= 15) {
            ContractViolation v = new ContractViolation();
            v.init("ANNUAL_LEAVE", "LOW",
                    "주 15시간 이상 근무 시 연차유급휴가 부여 의무가 있으나 계약서에 명시되어 있지 않습니다.",
                    "근로기준법 제60조");
            extra.add(v);
        }

        // 필수 기재사항: 핵심 항목이 다수 누락된 경우
        int missing = 0;
        if (info.getHourlyWage() == null) missing++;
        if (info.getWorkingHoursPerDay() == null) missing++;
        if (info.getStartDate() == null) missing++;
        if (info.getWorkPlace() == null) missing++;
        if (info.getJobDescription() == null) missing++;
        if (missing >= 3) {
            ContractViolation v = new ContractViolation();
            v.init("MANDATORY_ITEMS", "HIGH",
                    String.format("근로계약서의 필수 기재사항(임금/근로시간/장소/업무내용) 중 %d개 항목이 확인되지 않습니다. 서면 교부 의무 위반 가능성이 있습니다.", missing),
                    "근로기준법 제17조");
            extra.add(v);
        }

        return extra;
    }

    /** 합산된 분석 결과(룰베이스 + RAG 포함)를 DB analysisJson에 저장할 JSON으로 직렬화. */
    private String serializePersistedAnalysis(
            ExtractedContractInfo extractedInfo,
            List<ContractViolation> violations,
            String summary
    ) {
        try {
            com.fasterxml.jackson.databind.node.ObjectNode root = objectMapper.createObjectNode();
            root.set("extractedInfo", objectMapper.valueToTree(extractedInfo));
            root.set("violations", objectMapper.valueToTree(violations));
            root.put("summary", summary == null ? "" : summary);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            log.warn("[계약서 분석 직렬화 실패] {} — raw 응답 fallback", e.getMessage());
            return "{}";
        }
    }

    /** 법제처 조문을 사용자 표시용 발췌로 다듬는다 (너무 길면 자르고 공백 정리). */
    private String formatArticleExcerpt(LawArticle article) {
        String body = article.body() == null ? "" : article.body().replaceAll("\\s+", " ").trim();
        if (body.length() > 600) {
            body = body.substring(0, 600) + " …";
        }
        String header = article.lawName() + " 제" + article.articleNumber() + "조"
                + (article.articleTitle() == null || article.articleTitle().isBlank()
                        ? "" : "(" + article.articleTitle() + ")");
        return header + "\n" + body;
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
