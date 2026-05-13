package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.dto.BusinessCandidate;
import com.albasave.albasave_server.jobposting.dto.ConcernItem;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import com.albasave.albasave_server.jobposting.dto.JobPostingAnalysisResponse;
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

    public JobPostingAnalysisService(
            OpenAiJobPostingExtractor extractor,
            DatabaseBusinessMatcher databaseBusinessMatcher,
            LocalBusinessMatcher businessMatcher,
            JobPostingRiskAnalyzer riskAnalyzer
    ) {
        this.extractor = extractor;
        this.databaseBusinessMatcher = databaseBusinessMatcher;
        this.businessMatcher = businessMatcher;
        this.riskAnalyzer = riskAnalyzer;
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

        return new JobPostingAnalysisResponse(
                extracted,
                candidates,
                concerns,
                report,
                extractedResult.isPresent()
        );
    }
}
