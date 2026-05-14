package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.domain.JobPostingAnalysis;
import com.albasave.albasave_server.jobposting.dto.AnalysisSection;
import com.albasave.albasave_server.jobposting.dto.BusinessCandidate;
import com.albasave.albasave_server.jobposting.dto.ConcernItem;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import com.albasave.albasave_server.jobposting.dto.JobPostingAnalysisResponse;
import com.albasave.albasave_server.jobposting.repository.JobPostingAnalysisRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final JobPostingRiskAnalyzer riskAnalyzer;
    private final JobPostingAnalysisRepository analysisRepository;
    private final ObjectMapper objectMapper;

    public JobPostingAnalysisService(
            OpenAiJobPostingExtractor extractor,
            DatabaseBusinessMatcher databaseBusinessMatcher,
            LocalBusinessMatcher businessMatcher,
            JobPostingRiskAnalyzer riskAnalyzer,
            JobPostingAnalysisRepository analysisRepository,
            ObjectMapper objectMapper
    ) {
        this.extractor = extractor;
        this.databaseBusinessMatcher = databaseBusinessMatcher;
        this.businessMatcher = businessMatcher;
        this.riskAnalyzer = riskAnalyzer;
        this.analysisRepository = analysisRepository;
        this.objectMapper = objectMapper;
    }

    public JobPostingAnalysisResponse analyze(MultipartFile image) throws IOException {
        Optional<ExtractedJobPosting> extractedResult = Optional.empty();
        ConcernItem aiFailureConcern = null;
        try {
            extractedResult = extractor.extract(image);
        } catch (RestClientResponseException exception) {
            aiFailureConcern = new ConcernItem(
                    "AI",
                    "HIGH",
                    "공고문 AI 추출 실패",
                    "OpenAI API 호출에 실패했습니다. API 키, 사용량 한도, 결제/크레딧 상태를 확인해야 합니다.",
                    "HTTP " + exception.getStatusCode().value()
            );
        }

        ExtractedJobPosting extracted = extractedResult.orElseGet(ExtractedJobPosting::empty);
        List<BusinessCandidate> candidates = databaseBusinessMatcher.findCandidates(extracted);
        if (candidates.isEmpty()) {
            candidates = businessMatcher.findCandidates(extracted);
        }
        List<ConcernItem> concerns = new ArrayList<>(riskAnalyzer.analyze(extracted, candidates));
        if (aiFailureConcern != null) {
            concerns.add(0, aiFailureConcern);
        }
        String report = riskAnalyzer.buildUserReport(extracted, candidates, concerns);
        AnalysisSection businessDataAnalysis = buildBusinessDataAnalysis(candidates, concerns);
        AnalysisSection postingTextAnalysis = buildPostingTextAnalysis(extracted, concerns);
        String finalSummary = buildFinalSummary(businessDataAnalysis, postingTextAnalysis);
        Long analysisId = saveAnalysis(extractedResult.isPresent(), extracted, candidates, concerns, report);

        return new JobPostingAnalysisResponse(
                analysisId,
                extracted,
                candidates,
                businessDataAnalysis,
                postingTextAnalysis,
                concerns,
                finalSummary,
                report,
                extractedResult.isPresent()
        );
    }

    private AnalysisSection buildBusinessDataAnalysis(List<BusinessCandidate> candidates, List<ConcernItem> concerns) {
        List<ConcernItem> businessConcerns = concerns.stream()
                .filter(concern -> List.of("AI", "MATCHING", "PUBLIC_DATA").contains(concern.type()))
                .toList();

        String summary;
        if (candidates.isEmpty()) {
            summary = "공고문에서 추출된 정보로 확정 가능한 업장 후보를 찾지 못했습니다. 상호명과 주소 확인 단계가 필요합니다.";
        } else {
            BusinessCandidate top = candidates.get(0);
            summary = top.businessName() + " 후보를 찾았습니다. 공공데이터상 상태는 "
                    + valueOrUnknown(top.businessStatus()) + "이며, 매칭 신뢰도는 "
                    + top.matchScore() + "점입니다.";
        }

        return new AnalysisSection("업장 및 공공데이터 분석", summary, businessConcerns);
    }

    private AnalysisSection buildPostingTextAnalysis(ExtractedJobPosting extracted, List<ConcernItem> concerns) {
        List<ConcernItem> postingConcerns = concerns.stream()
                .filter(concern -> !List.of("AI", "MATCHING", "PUBLIC_DATA").contains(concern.type()))
                .toList();

        String summary;
        if (postingConcerns.isEmpty()) {
            summary = "공고문 자체에서 즉시 확인되는 고위험 문구는 많지 않습니다. 다만 휴게시간, 주휴수당, 계약서 작성 여부는 지원 전 확인해야 합니다.";
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

    private Long saveAnalysis(
            boolean openAiUsed,
            ExtractedJobPosting extracted,
            List<BusinessCandidate> candidates,
            List<ConcernItem> concerns,
            String report
    ) {
        BusinessCandidate top = candidates.isEmpty() ? null : candidates.get(0);
        JobPostingAnalysis analysis = new JobPostingAnalysis(
                openAiUsed,
                top == null ? null : top.businessName(),
                top == null ? null : top.businessStatus(),
                toJson(extracted),
                toJson(candidates),
                toJson(concerns),
                report
        );
        return analysisRepository.save(analysis).getId();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "미확인" : value;
    }
}
