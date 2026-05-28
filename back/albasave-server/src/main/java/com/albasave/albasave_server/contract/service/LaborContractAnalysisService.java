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
import com.albasave.albasave_server.lawapi.dto.LawChunkMatch;
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

        String base64Image = encodeImage(image);

        // 2-A. [Level 2 — 1차 LLM] Vision으로 추출만
        String extractRaw = callOpenAiExtract(base64Image);
        String extractJson = cleanJson(extractRaw);
        ExtractedContractInfo extractedInfo = parseExtractedInfo(extractJson);

        // 2-B. 시급 미명시 시 월급/일급에서 역산
        if (extractedInfo != null) {
            applyWageCalculation(extractedInfo);
        }

        // 2-C. [Level 1 RAG] 추출 정보로 관련 법령 의미 검색
        String retrievalQuery = buildRetrievalQuery(extractedInfo);
        List<LawChunkMatch> retrievedArticles =
                legalContextService.searchSimilar(retrievalQuery, 5);
        log.info("[계약서 RAG] 검색 쿼리='{}' → {}개 조문 검색됨",
                truncate(retrievalQuery, 80), retrievedArticles.size());

        // 2-D. [Level 2 — 2차 LLM] 추출 정보 + 검색된 조문 → 위반 판단
        List<ContractViolation> violations = new java.util.ArrayList<>(
                callOpenAiJudge(extractedInfo, retrievedArticles)
        );

        // 3. 룰베이스 추가 검증 (역산 시급 포함)
        violations.addAll(ruleBasedCheck(extractedInfo));

        // 3-1. 중복 제거 (같은 type이 LLM + 룰베이스 양쪽에서 나올 수 있음)
        violations = dedupeViolations(violations);

        // 4. legalBasisExcerpt 채우기:
        //    각 violation의 description으로 의미 검색 → top-1 조문 본문 첨부
        //    검색 실패 시 기존 매핑(Level 0)으로 폴백
        for (ContractViolation v : violations) {
            attachLegalContext(v);
        }

        // 5. 종합 요약: 1차 응답의 summary 우선, 없으면 기본 메시지
        String summary = parseSummary(extractJson);
        if (summary == null || summary.isBlank()) {
            summary = violations.isEmpty()
                    ? "분석된 계약서에서 명확한 위반 사항은 발견되지 않았습니다."
                    : String.format("총 %d개의 점검 항목이 발견되었습니다. 상세 내용을 확인하세요.", violations.size());
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

    /**
     * 시급이 null인 경우 월급/일급에서 역산하여 calculatedHourlyWage에 설정.
     * 시급 = 월급 / ((주소정근로시간 + 주휴시간) × 52/12)
     * 주휴시간 = 1일 소정근로시간 (1일분 유급휴일)
     */
    private void applyWageCalculation(ExtractedContractInfo info) {
        if (info.getHourlyWage() != null) return; // 이미 시급 있으면 건너뜀

        Double hpd = info.getWorkingHoursPerDay();
        Integer dpw = info.getWorkingDaysPerWeek();

        if (info.getMonthlyWage() != null && hpd != null && dpw != null && dpw > 0) {
            // 주 소정근로시간
            double weeklyHours = hpd * dpw;
            // 주휴시간 = 1일 소정근로시간 (근로기준법 제55조, 주 15시간 이상 시 1일분)
            double weeklyPaidHours = weeklyHours >= 15 ? weeklyHours + hpd : weeklyHours;
            // 월 소정유급시간 = 주 유급시간 × (52주/12월)
            double monthlyHours = weeklyPaidHours * 52.0 / 12.0;
            if (monthlyHours > 0) {
                int calculated = (int) Math.round(info.getMonthlyWage() / monthlyHours);
                info.setCalculatedHourlyWage(calculated);
                log.info("[시급 역산] 월급={}, 일 {}h × 주 {}일 → 월 {}h → 시급 {}원",
                        info.getMonthlyWage(), hpd, dpw, String.format("%.1f", monthlyHours), calculated);
            }
        } else if (info.getDailyWage() != null && hpd != null && hpd > 0) {
            int calculated = (int) Math.round(info.getDailyWage() / hpd);
            info.setCalculatedHourlyWage(calculated);
            log.info("[시급 역산] 일급={}, 일 {}h → 시급 {}원", info.getDailyWage(), hpd, calculated);
        }
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
                info.getEffectiveHourlyWage(),
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
    //  Level 2 RAG: 의미 검색 쿼리 빌드 + 2차 위반 판단 + 헬퍼
    // ─────────────────────────────────────────────────────────────────

    /**
     * 추출 정보로부터 의미 검색용 자유 텍스트 쿼리를 만든다.
     * 주요 수치/조항을 자연어로 풀어서 임베딩 검색의 신호를 강화.
     */
    private String buildRetrievalQuery(ExtractedContractInfo info) {
        if (info == null) {
            return "근로계약서 필수 기재사항 임금 근로시간 휴게 주휴수당 연차";
        }
        StringBuilder sb = new StringBuilder();
        Double hpd = info.getWorkingHoursPerDay();
        Integer dpw = info.getWorkingDaysPerWeek();
        if (hpd != null && dpw != null) {
            sb.append("1일 ").append(hpd).append("시간, 주 ").append(dpw).append("일 근무 ");
        }
        Integer wage = info.getEffectiveHourlyWage();
        if (wage != null) sb.append("시급 ").append(wage).append("원 ");
        if (info.getMonthlyWage() != null) sb.append("월급 ").append(info.getMonthlyWage()).append("원 ");

        if (Boolean.FALSE.equals(info.getBreakTimeMentioned())) sb.append("휴게시간 미명시 ");
        if (Boolean.FALSE.equals(info.getWeeklyHolidayAllowanceMentioned())) sb.append("주휴수당 미명시 ");
        if (Boolean.FALSE.equals(info.getOvertimeAllowanceMentioned())) sb.append("연장수당 미명시 ");
        if (Boolean.FALSE.equals(info.getAnnualLeaveMentioned())) sb.append("연차유급휴가 미명시 ");

        if (sb.length() == 0) sb.append("근로계약서 위반 검토 임금 근로시간 휴게 주휴수당 연차");
        return sb.toString().trim();
    }

    /**
     * Level 2 — 2차 호출: 추출 정보 + 검색된 조문을 근거로 위반 판단.
     * Vision 불필요 (text-only) → gpt-4o-mini로도 충분.
     */
    private List<ContractViolation> callOpenAiJudge(
            ExtractedContractInfo info,
            List<LawChunkMatch> retrievedArticles
    ) {
        if (!openAiProperties.isConfigured() || info == null) return List.of();

        String prompt = buildJudgePrompt(info, retrievedArticles);
        try {
            RestClient client = RestClient.create();
            // text-only이므로 gpt-4o-mini 사용 (비용 절감, 충분히 정확)
            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", "gpt-4o-mini",
                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "max_tokens", 1500,
                    "temperature", 0
            ));

            String response = client.post()
                    .uri(openAiProperties.baseUrl() + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiProperties.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            String cleaned = cleanJson(content);
            JsonNode parsed = objectMapper.readTree(cleaned);
            JsonNode arr = parsed.path("violations");
            if (!arr.isArray()) return List.of();

            return objectMapper.convertValue(arr, new TypeReference<List<ContractViolation>>() {});
        } catch (Exception e) {
            log.warn("[계약서 Judge LLM 실패] {} — 룰베이스만 적용", e.getMessage());
            return List.of();
        }
    }

    private String buildJudgePrompt(ExtractedContractInfo info, List<LawChunkMatch> retrieved) {
        String factsJson;
        try {
            factsJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(info);
        } catch (Exception e) {
            factsJson = info.toString();
        }

        StringBuilder ctx = new StringBuilder();
        for (int i = 0; i < retrieved.size(); i++) {
            LawChunkMatch m = retrieved.get(i);
            ctx.append("【조문 ").append(i + 1).append("】 ")
               .append(m.header())
               .append(" (유사도 거리: ").append(String.format("%.4f", m.distance())).append(")\n")
               .append(m.content()).append("\n\n");
        }
        if (ctx.length() == 0) ctx.append("(검색된 관련 조문이 없습니다)\n");

        return """
                당신은 한국 근로기준법 전문가입니다.
                아래에 (A) 계약서에서 추출한 사실 정보 와 (B) 관련 법령 조문 발췌 가 주어집니다.
                두 자료만을 근거로 위반 여부를 JSON 배열로 응답하세요.

                [규칙]
                1. 제공된 조문 발췌에 명확히 근거가 있을 때만 위반으로 판단.
                2. 추측·일반화·할루시네이션 금지. 사실 정보에 값이 null이면 그 항목은 판단 보류.
                3. MINIMUM_WAGE / REST_TIME 위반은 별도 룰베이스가 정확히 판단하므로 여기서 추가하지 마세요.
                4. 가능한 type: OVERTIME_PAY, WEEKLY_HOLIDAY, MANDATORY_ITEMS, WORKING_HOURS, ANNUAL_LEAVE
                5. severity: HIGH / MEDIUM / LOW
                6. legalBasis: 발췌된 조문 중 가장 관련성 높은 것의 "근로기준법 제XX조" 형식 표기.
                7. JSON 외 텍스트 절대 출력 금지.

                === (A) 추출된 계약서 사실 ===
                %s

                === (B) 관련 법령 조문 발췌 (의미 검색 결과) ===
                %s

                === 응답 형식 ===
                {
                  "violations": [
                    {
                      "type": "OVERTIME_PAY",
                      "severity": "MEDIUM",
                      "description": "구체적 위반 설명 (사실+조문 근거)",
                      "legalBasis": "근로기준법 제56조"
                    }
                  ]
                }
                """.formatted(factsJson, ctx.toString());
    }

    /** 같은 type의 violation이 LLM + 룰베이스 양쪽에서 나오면 룰베이스를 우선시한다. */
    private List<ContractViolation> dedupeViolations(List<ContractViolation> all) {
        // 같은 type 두 번째 등장부터는 제거. 룰베이스는 LLM 뒤에 add되므로
        // LinkedHashMap에 type 기준으로 마지막 값(룰베이스)을 유지하도록 putAll 순서를 그대로 이용.
        java.util.LinkedHashMap<String, ContractViolation> byType = new java.util.LinkedHashMap<>();
        for (ContractViolation v : all) {
            if (v.getType() == null) {
                byType.put("_anon_" + System.identityHashCode(v), v);
            } else {
                byType.put(v.getType(), v);
            }
        }
        return new java.util.ArrayList<>(byType.values());
    }

    /**
     * violation에 법령 조문 본문을 첨부.
     * 1) 의미 검색(description으로) → top-1 조문 본문
     * 2) 실패 시 기존 매핑(LegalContextService.findArticleForViolation) → 폴백
     */
    private void attachLegalContext(ContractViolation v) {
        if (v.getDescription() != null && !v.getDescription().isBlank()) {
            List<LawChunkMatch> matches = legalContextService.searchSimilar(v.getDescription(), 1);
            if (!matches.isEmpty()) {
                LawChunkMatch best = matches.get(0);
                String excerpt = best.header() + "\n" + truncate(best.content(), 600);
                v.setLegalBasisExcerpt(excerpt);
                return;
            }
        }
        // 폴백
        legalContextService.findArticleForViolation(v.getType())
                .map(this::formatArticleExcerpt)
                .ifPresent(v::setLegalBasisExcerpt);
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + " …";
    }

    // ─────────────────────────────────────────────────────────────────
    //  OpenAI 호출
    // ─────────────────────────────────────────────────────────────────

    /** Level 2 — 1차 호출: 이미지에서 추출만. violations 판단은 하지 않음. */
    private String callOpenAiExtract(String base64Image) {
        if (!openAiProperties.isConfigured()) {
            return buildUnavailableResponse("OPENAI_API_KEY가 설정되지 않았습니다.");
        }

        String prompt = buildExtractPrompt();
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

    /** Level 2 — 1차 prompt: 추출 전용. violations 판단 X. */
    private String buildExtractPrompt() {
        return """
                당신은 한국 근로계약서 분석을 위한 정밀 OCR 분석가입니다.
                첨부된 근로계약서 이미지에서 정보를 추출하여 아래 JSON 형식으로만 응답하세요.
                JSON 외 다른 텍스트는 절대 포함하지 마세요.

                [절대 원칙 — 위반 시 치명적 오류]
                1. 이미지에 명시적으로 보이지 않는 값은 절대 만들어내지 마세요. HALLUCINATION 엄금.
                2. 흐릿하거나 일부만 보이거나 확실하지 않으면 그 필드는 반드시 null.
                3. "전형적인 계약서라면 이럴 것이다"는 가정으로 값을 채우는 행위는 엄중한 오류입니다.
                4. businessRegistrationNumber: 계약서에 '사업자등록번호', '법인등록번호' 등 명칭과 함께
                   10자리 숫자가 명시되어 있는 경우에만 반환. 전화번호·계좌번호·주민번호 혼동 금지.
                5. employerName: 이미지에서 실제로 읽은 상호·이름만 반환. 임의로 변경·완성 금지.

                추출 규칙:
                - hourlyWage: 계약서에 '시급'이 명시된 경우만 숫자 반환. 월급·일급제면 null.
                - monthlyWage: 월 기준 기본 금액. 식대·가족수당 등 부가급여 제외.
                - dailyWage: '일급' 명시된 경우만 숫자.
                - workingHoursPerDay: 1일 소정근로시간 (휴게시간 제외 실제 근로시간).
                  예: 9시~16시 중 휴게 12시~13시 1시간 → 소정근로시간 = 6시간.
                - breakTimeMentioned: 계약서에 휴게 시간대가 명시적으로 기재되어 있으면 true.
                - businessRegistrationNumber: 하이픈 제거, 숫자 10자리만.
                - workDays: 영어 풀네임 대문자 배열. 한글 '월~금' → 해당 요일 모두 포함.
                - workStartTime / workEndTime: "HH:mm" 24시간 형식.
                - employmentStartDate: "yyyy-MM-dd" ISO 형식.

                응답 형식 (이것 외에 어떤 텍스트도 출력 금지):
                {
                  "extractedInfo": {
                    "hourlyWage": 시급(숫자) 또는 null,
                    "monthlyWage": 월급(숫자) 또는 null,
                    "dailyWage": 일급(숫자) 또는 null,
                    "workingHoursPerDay": 1일 소정근로시간(숫자) 또는 null,
                    "workingDaysPerWeek": 주 근무일수(숫자) 또는 null,
                    "startDate": "근무 시작일 원본 문자열" 또는 null,
                    "workPlace": "근무 장소" 또는 null,
                    "jobDescription": "업무 내용" 또는 null,
                    "weeklyHolidayAllowanceMentioned": true 또는 false,
                    "overtimeAllowanceMentioned": true 또는 false,
                    "annualLeaveMentioned": true 또는 false,
                    "breakTimeMentioned": true 또는 false,
                    "employerName": "고용주 상호" 또는 null,
                    "businessRegistrationNumber": "10자리 숫자" 또는 null,
                    "workDays": ["MONDAY", ...] 또는 [],
                    "workStartTime": "HH:mm" 또는 null,
                    "workEndTime": "HH:mm" 또는 null,
                    "employmentStartDate": "yyyy-MM-dd" 또는 null
                  },
                  "summary": "계약서 핵심 요약 (2~3문장, 이미지에 보이는 사실만 기반)"
                }
                """;
    }

    /** @deprecated Level 1에서 사용했던 단일 호출 prompt. 호환용으로 남겨둠. */
    @Deprecated
    private String buildPrompt() {
        return """
                당신은 한국 근로기준법 전문가이자 정밀 OCR 분석가입니다.
                첨부된 근로계약서 이미지를 분석하여 아래 JSON 형식으로만 응답하세요.
                JSON 외 다른 텍스트는 절대 포함하지 마세요.

                [절대 원칙 — 위반 시 치명적 오류]
                1. 이미지에 명시적으로 보이지 않는 값은 절대 만들어내지 마세요. HALLUCINATION 엄금.
                2. 흐릿하거나 일부만 보이거나 확실하지 않으면 그 필드는 반드시 null.
                3. "전형적인 계약서라면 이럴 것이다"는 가정으로 값을 채우는 행위는 엄중한 오류입니다.
                4. 특히 businessRegistrationNumber: 계약서에 '사업자등록번호', '법인등록번호' 등 명칭과 함께
                   10자리 숫자가 명시되어 있는 경우에만 반환. 전화번호·계좌번호·주민번호와 혼동 금지.
                   등록번호가 이미지에 없으면 반드시 null.
                5. 특히 employerName: 이미지에서 실제로 읽은 상호·이름만 반환. "○○회사" 같은 형태가 이미지에
                   그대로 있으면 그대로, "○○물산"이 있으면 "○○물산"으로 반환. 임의로 변경·완성 금지.
                6. violations 배열에는 이미지에서 직접 확인 가능한 위반만 포함하세요.
                   MINIMUM_WAGE 위반은 hourlyWage가 숫자로 명시되어 있고 10,030원 미만인 경우에만 추가.
                   hourlyWage가 null이거나 월급·일급제인 경우에는 MINIMUM_WAGE를 violations에 추가하지 마세요.

                분석 기준 (2026년 기준):
                - 최저시급: 10,030원
                - 연장·야간·휴일 근로: 통상임금의 50%% 가산 (근로기준법 제56조)
                - 주휴수당: 1주 15시간 이상 근무 시 1일분 임금 추가 지급 (근로기준법 제55조)
                - 근로계약서 필수 기재사항 (근로기준법 제17조):
                  임금, 소정근로시간, 제55조 휴일, 제60조 연차유급휴가, 취업 장소, 업무 내용

                추출 규칙:
                - hourlyWage: 계약서에 '시급' 또는 '시간(당)' 임금이 명시된 경우만 숫자 반환. 월급·일급제면 null.
                - monthlyWage: 계약서에 '월급', '월(月)', '월 × 원', '일(日)·시(時)·간급' 항목이 월 기준 금액인 경우.
                  식대·가족수당 등 부가급여 제외한 기본 월급 금액.
                - dailyWage: 계약서에 '일급' 또는 '일(日) 기준' 임금이 명시된 경우만 숫자 반환.
                - workingHoursPerDay: 1일 소정근로시간. 휴게시간이 명시된 경우 그것을 제외한 실제 근로시간.
                  예: 9시~16시 중 휴게 12시~13시 1시간 → 소정근로시간 = 6시간.
                  근무시간 범위만 있고 휴게가 없으면 종료시각 - 시작시각으로 계산.
                - breakTimeMentioned: 계약서에 휴게 시간대(예: "12시~13시", "점심시간 1시간" 등)가 명시적으로
                  기재되어 있으면 true, 전혀 언급이 없으면 false. 단순히 근무시간이 8시간 이상이라는 이유로
                  true로 추정하지 마세요.
                - businessRegistrationNumber: 하이픈 제거 후 숫자 10자리만 반환. 없으면 null.
                - workDays: 영어 풀네임 대문자 배열. 한글 '월~금' 범위 표현 → 해당 요일 모두 포함. 불명확 → [].
                - workStartTime / workEndTime: "HH:mm" 24시간 형식. '오전 9시' → "09:00". 불명확 → null.
                - employmentStartDate: "yyyy-MM-dd" ISO 형식. '2026년 4월 1일' → "2026-04-01". 불명확 → null.

                응답 형식:
                {
                  "extractedInfo": {
                    "hourlyWage": 시급(숫자) 또는 null,
                    "monthlyWage": 월급(숫자) 또는 null,
                    "dailyWage": 일급(숫자) 또는 null,
                    "workingHoursPerDay": 1일 소정근로시간(숫자, 휴게 제외) 또는 null,
                    "workingDaysPerWeek": 주 근무일수(숫자) 또는 null,
                    "startDate": "근무 시작일 원본 문자열" 또는 null,
                    "workPlace": "근무 장소" 또는 null,
                    "jobDescription": "업무 내용" 또는 null,
                    "weeklyHolidayAllowanceMentioned": true 또는 false,
                    "overtimeAllowanceMentioned": true 또는 false,
                    "annualLeaveMentioned": true 또는 false,
                    "breakTimeMentioned": true 또는 false,
                    "employerName": "이미지에서 읽은 고용주 상호·이름" 또는 null,
                    "businessRegistrationNumber": "사업자등록번호 10자리(이미지에 있는 경우만)" 또는 null,
                    "workDays": ["MONDAY", ...] 또는 [],
                    "workStartTime": "HH:mm" 또는 null,
                    "workEndTime": "HH:mm" 또는 null,
                    "employmentStartDate": "yyyy-MM-dd" 또는 null
                  },
                  "violations": [
                    {
                      "type": "OVERTIME_PAY / WEEKLY_HOLIDAY / MANDATORY_ITEMS / WORKING_HOURS / ANNUAL_LEAVE",
                      "severity": "HIGH 또는 MEDIUM 또는 LOW",
                      "description": "구체적인 위반 내용 설명 (이미지 근거)",
                      "legalBasis": "근로기준법 제XX조"
                    }
                  ],
                  "summary": "전체 분석 요약 (2~3문장)"
                }

                주의: violations 배열에는 이미지에서 직접 확인한 위반만 넣으세요.
                최저임금/휴게시간/연차휴가 위반은 별도 서버 룰베이스가 정확히 판단하므로 violations에 넣지 마세요.
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
     * OpenAI 없이도 판단 가능한 룰베이스 검증.
     * applyWageCalculation() 호출 이후에 실행해야 역산 시급을 활용할 수 있음.
     */
    private List<ContractViolation> ruleBasedCheck(ExtractedContractInfo info) {
        List<ContractViolation> extra = new java.util.ArrayList<>();
        if (info == null) return extra;

        int minWage = WageCalculationService.MINIMUM_WAGE_2026;

        // 최저임금 위반: 역산 시급 포함하여 판단
        Integer effectiveWage = info.getEffectiveHourlyWage();
        if (effectiveWage != null && effectiveWage < minWage) {
            boolean isCalculated = info.getHourlyWage() == null;
            ContractViolation v = new ContractViolation();
            v.init("MINIMUM_WAGE", "HIGH",
                    isCalculated
                        ? String.format("월급에서 역산한 시급 %,d원이 2026년 최저시급 %,d원에 미달합니다.",
                                effectiveWage, minWage)
                        : String.format("계약 시급 %,d원이 2026년 최저시급 %,d원에 미달합니다.",
                                effectiveWage, minWage),
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

        // 휴게시간: 일 4시간 이상인데 계약서에 휴게시간이 명시되어 있지 않을 때만 이슈
        // breakTimeMentioned == false 인 경우에만 추가 (true면 정상, null이면 불명확이므로 경고)
        if (hpd != null && hpd >= 4 && !Boolean.TRUE.equals(info.getBreakTimeMentioned())) {
            String required = hpd >= 8 ? "1시간" : "30분";
            boolean definitelyMissing = Boolean.FALSE.equals(info.getBreakTimeMentioned());
            String desc = definitelyMissing
                    ? String.format("일 %.1f시간 근무라면 근로시간 도중 %s 이상의 휴게시간을 부여해야 하지만, 계약서에 휴게시간이 명시되어 있지 않습니다.",
                            hpd, required)
                    : String.format("일 %.1f시간 근무 기준으로 %s 이상의 휴게시간이 필요합니다. 계약서에서 휴게시간 명시 여부를 확인하세요.",
                            hpd, required);
            ContractViolation v = new ContractViolation();
            v.init("REST_TIME", "LOW", desc, "근로기준법 제54조");
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

        // 필수 기재사항: 임금(시급·월급·일급 중 하나라도 있으면 OK), 근로시간, 장소, 업무 누락 검사
        int missing = 0;
        boolean hasWage = info.getHourlyWage() != null
                || info.getMonthlyWage() != null
                || info.getDailyWage() != null;
        if (!hasWage) missing++;
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
