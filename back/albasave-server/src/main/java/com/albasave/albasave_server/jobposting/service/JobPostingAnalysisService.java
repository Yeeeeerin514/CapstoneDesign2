package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.domain.JobPostingAnalysis;
import com.albasave.albasave_server.jobposting.dto.AnalysisSection;
import com.albasave.albasave_server.jobposting.dto.BusinessCandidate;
import com.albasave.albasave_server.jobposting.dto.ConcernItem;
import com.albasave.albasave_server.jobposting.dto.ExternalRiskCheck;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import com.albasave.albasave_server.jobposting.dto.JobPostingAnalysisResponse;
import com.albasave.albasave_server.jobposting.repository.JobPostingAnalysisRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class JobPostingAnalysisService {
    private final OpenAiJobPostingExtractor extractor;
    private final DatabaseBusinessMatcher databaseBusinessMatcher;
    private final LocalBusinessMatcher businessMatcher;
    private final ExternalBusinessRiskService externalBusinessRiskService;
    private final JobPostingImageStorageService imageStorageService;
    private final JobPostingRiskAnalyzer riskAnalyzer;
    private final JobPostingAnalysisRepository analysisRepository;
    private final ObjectMapper objectMapper;

    public JobPostingAnalysisService(
            OpenAiJobPostingExtractor extractor,
            DatabaseBusinessMatcher databaseBusinessMatcher,
            LocalBusinessMatcher businessMatcher,
            ExternalBusinessRiskService externalBusinessRiskService,
            JobPostingImageStorageService imageStorageService,
            JobPostingRiskAnalyzer riskAnalyzer,
            JobPostingAnalysisRepository analysisRepository,
            ObjectMapper objectMapper
    ) {
        this.extractor = extractor;
        this.databaseBusinessMatcher = databaseBusinessMatcher;
        this.businessMatcher = businessMatcher;
        this.externalBusinessRiskService = externalBusinessRiskService;
        this.imageStorageService = imageStorageService;
        this.riskAnalyzer = riskAnalyzer;
        this.analysisRepository = analysisRepository;
        this.objectMapper = objectMapper;
    }

    public JobPostingAnalysisResponse analyze(MultipartFile image) throws IOException {
        Optional<String> imageUrl = imageStorageService.upload(image);
        Optional<ExtractedJobPosting> extractedResult = Optional.empty();
        ConcernItem aiFailureConcern = null;

        try {
            extractedResult = extractor.extract(image);
        } catch (RestClientResponseException exception) {
            aiFailureConcern = new ConcernItem(
                    "AI",
                    "HIGH",
                    "공고문 AI 추출 실패",
                    "OpenAI API 호출에 실패했습니다. 토큰/크레딧, 결제 상태, 요청 제한을 확인해야 합니다.",
                    "HTTP " + exception.getStatusCode().value()
            );
        } catch (RuntimeException exception) {
            aiFailureConcern = new ConcernItem(
                    "AI",
                    "HIGH",
                    "공고문 AI 추출 실패",
                    "OpenAI 응답 처리 중 오류가 발생했습니다.",
                    exception.getClass().getSimpleName()
            );
        }

        ExtractedJobPosting extracted = extractedResult.orElseGet(ExtractedJobPosting::empty);
        // LLM이 동의어 가이드를 무시하고 missingInformation에 잘못 넣은 항목을
        // 본문 추출값을 보고 코드로 후처리 정정.
        extracted = sanitizeMissingInformation(extracted);
        // dummy 패턴(가짜 전화/주소) 감지 후 null 처리
        extracted = stripDummyValues(extracted);
        List<BusinessCandidate> candidates = databaseBusinessMatcher.findCandidates(extracted);
        if (candidates.isEmpty()) {
            candidates = businessMatcher.findCandidates(extracted);
        }
        List<ExternalRiskCheck> externalChecks = externalBusinessRiskService.check(extracted, candidates);
        List<ConcernItem> concerns = new ArrayList<>(riskAnalyzer.analyze(extracted, candidates, externalChecks));
        if (aiFailureConcern != null) {
            concerns.add(0, aiFailureConcern);
        }

        String report = riskAnalyzer.buildUserReport(extracted, candidates, externalChecks, concerns);
        AnalysisSection businessDataAnalysis = buildBusinessDataAnalysis(candidates, externalChecks, concerns);
        AnalysisSection postingTextAnalysis = buildPostingTextAnalysis(extracted, concerns);
        String finalSummary = buildFinalSummary(businessDataAnalysis, postingTextAnalysis);
        JobPostingAnalysis analysis = saveAnalysis(
                extractedResult.isPresent(),
                extracted,
                candidates,
                externalChecks,
                concerns,
                report,
                imageUrl.orElse(null)
        );

        JobPostingAnalysisResponse response = new JobPostingAnalysisResponse(
                analysis.getId(),
                extracted,
                candidates,
                imageUrl.orElse(null),
                externalChecks,
                businessDataAnalysis,
                postingTextAnalysis,
                concerns,
                finalSummary,
                report,
                extractedResult.isPresent()
        );
        analysis.setResponseJson(toJson(response));
        analysisRepository.save(analysis);
        return response;
    }

    public JobPostingAnalysisResponse getAnalysis(Long analysisId) {
        JobPostingAnalysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("분석 결과를 찾을 수 없습니다: " + analysisId));
        if (analysis.getResponseJson() != null && !analysis.getResponseJson().isBlank()) {
            try {
                return objectMapper.readValue(analysis.getResponseJson(), JobPostingAnalysisResponse.class);
            } catch (JsonProcessingException ignored) {
                // Fall through and rebuild from stored JSON fragments.
            }
        }

        ExtractedJobPosting extracted = fromJson(analysis.getExtractedJson(), ExtractedJobPosting.class, ExtractedJobPosting.empty());
        List<BusinessCandidate> candidates = fromJson(analysis.getCandidatesJson(), new TypeReference<>() {}, List.of());
        List<ExternalRiskCheck> externalChecks = fromJson(analysis.getExternalChecksJson(), new TypeReference<>() {}, List.of());
        List<ConcernItem> concerns = fromJson(analysis.getConcernsJson(), new TypeReference<>() {}, List.of());
        AnalysisSection businessDataAnalysis = buildBusinessDataAnalysis(candidates, externalChecks, concerns);
        AnalysisSection postingTextAnalysis = buildPostingTextAnalysis(extracted, concerns);
        return new JobPostingAnalysisResponse(
                analysis.getId(),
                extracted,
                candidates,
                analysis.getImageUrl(),
                externalChecks,
                businessDataAnalysis,
                postingTextAnalysis,
                concerns,
                buildFinalSummary(businessDataAnalysis, postingTextAnalysis),
                analysis.getReport(),
                analysis.isOpenAiUsed()
        );
    }

    private AnalysisSection buildBusinessDataAnalysis(
            List<BusinessCandidate> candidates,
            List<ExternalRiskCheck> externalChecks,
            List<ConcernItem> concerns
    ) {
        List<ConcernItem> businessConcerns = concerns.stream()
                .filter(concern -> List.of("AI", "MATCHING", "PUBLIC_DATA", "EXTERNAL_API").contains(concern.type()))
                .toList();

        String summary;
        if (candidates.isEmpty()) {
            summary = "공고문에서 추출된 정보로 확정 가능한 업장 후보를 찾지 못했습니다. 상호명, 주소, 전화번호 확인 단계가 필요합니다.";
        } else {
            BusinessCandidate top = candidates.get(0);
            summary = top.businessName() + " 후보를 찾았습니다. 공공데이터상 상태는 "
                    + valueOrUnknown(top.businessStatus()) + "이며, 매칭 신뢰도는 "
                    + top.matchScore() + "점입니다.";
        }
        long configuredChecks = externalChecks.stream()
                .filter(check -> !"NOT_CONFIGURED".equalsIgnoreCase(check.status()))
                .count();
        summary += " 외부 공공 API 확인 항목은 " + configuredChecks + "개 실행/시도되었습니다.";

        return new AnalysisSection("업장 및 공공데이터 분석", summary, businessConcerns);
    }

    private AnalysisSection buildPostingTextAnalysis(ExtractedJobPosting extracted, List<ConcernItem> concerns) {
        List<ConcernItem> postingConcerns = concerns.stream()
                .filter(concern -> !List.of("AI", "MATCHING", "PUBLIC_DATA", "EXTERNAL_API").contains(concern.type()))
                .toList();

        String summary;
        if (postingConcerns.isEmpty()) {
            summary = "공고문 자체에서 즉시 확인되는 위험 문구는 많지 않습니다. 다만 휴게시간, 주휴수당, 계약서 작성 여부는 지원 전 확인해야 합니다.";
        } else {
            summary = "공고문에서 " + postingConcerns.size() + "개의 확인 필요 항목을 찾았습니다.";
        }
        if (extracted.hourlyWageText() != null && !extracted.hourlyWageText().isBlank()) {
            summary += " 추출된 급여 정보는 " + extracted.hourlyWageText() + "입니다.";
        }

        return new AnalysisSection("공고문 문구 분석", summary, postingConcerns);
    }

    private String buildFinalSummary(AnalysisSection businessDataAnalysis, AnalysisSection postingTextAnalysis) {
        return businessDataAnalysis.summary() + " " + postingTextAnalysis.summary();
    }

    private JobPostingAnalysis saveAnalysis(
            boolean openAiUsed,
            ExtractedJobPosting extracted,
            List<BusinessCandidate> candidates,
            List<ExternalRiskCheck> externalChecks,
            List<ConcernItem> concerns,
            String report,
            String imageUrl
    ) {
        BusinessCandidate top = candidates.isEmpty() ? null : candidates.get(0);
        JobPostingAnalysis analysis = new JobPostingAnalysis(
                openAiUsed,
                top == null ? null : top.businessName(),
                top == null ? null : top.businessStatus(),
                toJson(extracted),
                toJson(candidates),
                toJson(externalChecks),
                toJson(concerns),
                report,
                imageUrl
        );
        return analysisRepository.save(analysis);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }

    private <T> T fromJson(String json, Class<T> type, T fallback) {
        try {
            return json == null || json.isBlank() ? fallback : objectMapper.readValue(json, type);
        } catch (JsonProcessingException exception) {
            return fallback;
        }
    }

    private <T> T fromJson(String json, TypeReference<T> type, T fallback) {
        try {
            return json == null || json.isBlank() ? fallback : objectMapper.readValue(json, type);
        } catch (JsonProcessingException exception) {
            return fallback;
        }
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "미확인" : value;
    }

    /**
     * LLM이 missingInformation에 잘못 넣은 항목을 본문 추출값을 보고 후처리 정정한다.
     * (LLM이 동의어 가이드를 무시하는 경우 안전망)
     *
     * - "계약기간": workScheduleText/rawSummary 등에 "근무기간|개월|년" 표현이 보이면 제거
     * - "주휴수당": benefits/rawSummary/suspiciousPhrases 에 "주휴" 포함되면 제거
     * - "휴게시간": benefits/rawSummary 에 "휴게|휴식" 포함되면 제거
     * - "4대보험": benefits 에 "4대보험|보험" 포함되면 제거
     * - "근무시간": workTimeText 또는 workScheduleText 가 비어있지 않으면 제거
     * - "근무요일": workDays 가 비어있지 않거나 workScheduleText 에 "월|화|...|일|주" 포함되면 제거
     */
    private ExtractedJobPosting sanitizeMissingInformation(ExtractedJobPosting extracted) {
        if (extracted == null) return extracted;

        // 1) 시급 후처리: hourlyWage가 null인데 hourlyWageText에 숫자가 있으면 파싱
        Integer fixedHourlyWage = extracted.hourlyWage();
        String fixedHourlyWageText = extracted.hourlyWageText();
        if (fixedHourlyWage == null && fixedHourlyWageText != null) {
            String digits = fixedHourlyWageText.replaceAll("[^0-9]", "");
            if (!digits.isBlank() && digits.length() >= 4 && digits.length() <= 6) {
                try {
                    int parsed = Integer.parseInt(digits);
                    if (parsed >= 5000 && parsed <= 100000) {
                        fixedHourlyWage = parsed;
                    }
                } catch (NumberFormatException ignored) {
                }
            }
        }

        // 2) missingInformation 후처리: 본문/추출값 보고 잘못된 항목 제거
        List<String> missing = extracted.missingInformation();
        List<String> filtered = missing == null ? new ArrayList<>() : new ArrayList<>(missing);

        if (!filtered.isEmpty()) {
            String corpus = buildSearchCorpus(extracted);
            String contractPeriod = extracted.contractPeriod();
            List<String> benefits = extracted.benefits() == null ? List.of() : extracted.benefits();
            String benefitsCorpus = String.join(" ", benefits);

            filtered.removeIf(item -> {
                if (item == null) return true;
                String norm = item.trim();
                if (norm.isEmpty()) return true;

                if (norm.contains("계약기간") || norm.equals("계약 기간") || norm.contains("근무기간")) {
                    // contractPeriod 추출됐거나 본문에 기간 표현이 있으면 제거
                    if (contractPeriod != null && !contractPeriod.isBlank()) return true;
                    return containsAny(corpus, "근무기간", "근무 기간", "고용기간", "개월", "년 ", "년차");
                }
                if (norm.contains("주휴")) {
                    return containsAny(corpus, "주휴");
                }
                if (norm.contains("휴게")) {
                    return containsAny(corpus, "휴게", "휴식");
                }
                if (norm.contains("4대보험") || norm.contains("사회보험")) {
                    return containsAny(benefitsCorpus, "4대보험", "보험", "국민연금", "건강보험", "고용보험", "산재보험");
                }
                if (norm.contains("근무시간") || norm.equals("시간")) {
                    String wt = extracted.workTimeText();
                    String ws = extracted.workScheduleText();
                    return (wt != null && !wt.isBlank()) || (ws != null && !ws.isBlank());
                }
                if (norm.contains("근무요일") || norm.equals("요일")) {
                    return (extracted.workDays() != null && !extracted.workDays().isEmpty())
                            || containsAny(corpus, "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일", "주 ");
                }
                return false;
            });
        }

        // 3) 변경 없으면 그대로 반환
        boolean unchanged = filtered.equals(missing)
                && java.util.Objects.equals(fixedHourlyWage, extracted.hourlyWage());
        if (unchanged) return extracted;

        return new ExtractedJobPosting(
                extracted.businessName(),
                extracted.brandName(),
                extracted.businessRegistrationNumber(),
                extracted.phone(),
                extracted.address(),
                extracted.jobTitle(),
                extracted.industryHint(),
                fixedHourlyWageText,
                fixedHourlyWage,
                extracted.workScheduleText(),
                extracted.workDays(),
                extracted.workTimeText(),
                extracted.contractPeriod(),
                extracted.employmentType(),
                extracted.benefits(),
                extracted.suspiciousPhrases(),
                filtered,
                extracted.llmConcerns(),
                extracted.overallAssessment(),
                extracted.rawSummary()
        );
    }

    private String buildSearchCorpus(ExtractedJobPosting e) {
        StringBuilder sb = new StringBuilder();
        appendNonBlank(sb, e.businessName());
        appendNonBlank(sb, e.brandName());
        appendNonBlank(sb, e.jobTitle());
        appendNonBlank(sb, e.industryHint());
        appendNonBlank(sb, e.hourlyWageText());
        appendNonBlank(sb, e.workScheduleText());
        appendNonBlank(sb, e.workTimeText());
        appendNonBlank(sb, e.contractPeriod());
        appendNonBlank(sb, e.employmentType());
        appendNonBlank(sb, e.rawSummary());
        if (e.benefits() != null) e.benefits().forEach(b -> appendNonBlank(sb, b));
        if (e.suspiciousPhrases() != null) e.suspiciousPhrases().forEach(s -> appendNonBlank(sb, s));
        if (e.workDays() != null) e.workDays().forEach(d -> appendNonBlank(sb, d));
        return sb.toString();
    }

    private void appendNonBlank(StringBuilder sb, String value) {
        if (value != null && !value.isBlank()) {
            sb.append(value).append(' ');
        }
    }

    private boolean containsAny(String source, String... needles) {
        if (source == null) return false;
        for (String n : needles) {
            if (source.contains(n)) return true;
        }
        return false;
    }

    /**
     * LLM이 이미지를 못 읽고 dummy로 채운 명백한 가짜 값을 null로 정리.
     */
    private ExtractedJobPosting stripDummyValues(ExtractedJobPosting e) {
        if (e == null) return e;
        String phone = isDummyPhone(e.phone()) ? null : e.phone();
        String address = isDummyAddress(e.address()) ? null : e.address();
        if (java.util.Objects.equals(phone, e.phone())
                && java.util.Objects.equals(address, e.address())) {
            return e;
        }
        return new ExtractedJobPosting(
                e.businessName(), e.brandName(), e.businessRegistrationNumber(),
                phone, address, e.jobTitle(), e.industryHint(),
                e.hourlyWageText(), e.hourlyWage(),
                e.workScheduleText(), e.workDays(), e.workTimeText(),
                e.contractPeriod(), e.employmentType(),
                e.benefits(), e.suspiciousPhrases(), e.missingInformation(),
                e.llmConcerns(), e.overallAssessment(), e.rawSummary()
        );
    }

    private boolean isDummyPhone(String phone) {
        if (phone == null || phone.isBlank()) return false;
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.length() < 7) return false;
        // 순차 패턴 (1234-5678 등) / 동일 숫자 반복 / 흔한 더미 패턴
        if (phone.matches(".*1234[-]?5678.*")) return true;
        if (phone.matches(".*1234[-]?1234.*")) return true;
        if (phone.matches(".*0000[-]?0000.*")) return true;
        if (phone.matches(".*9876[-]?5432.*")) return true;
        if (digits.contains("12345678")) return true;
        if (digits.contains("00000000")) return true;
        if (digits.contains("11111111")) return true;
        return false;
    }

    private boolean isDummyAddress(String address) {
        if (address == null || address.isBlank()) return false;
        String compact = address.replaceAll("\\s+", "");
        // 너무 자주 쓰이는 generic placeholder 주소들
        return compact.contains("테헤란로123")
                || compact.contains("강남대로123")
                || compact.contains("강남구역삼동123")
                || compact.matches(".*[가-힣]+로\\s?123[^0-9].*")
                || compact.matches(".*[가-힣]+로\\s?123$");
    }
}
