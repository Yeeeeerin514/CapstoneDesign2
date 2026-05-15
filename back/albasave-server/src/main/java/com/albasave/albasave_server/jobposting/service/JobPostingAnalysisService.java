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
}
