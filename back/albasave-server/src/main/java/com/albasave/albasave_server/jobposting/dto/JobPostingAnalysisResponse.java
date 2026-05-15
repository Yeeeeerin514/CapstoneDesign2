package com.albasave.albasave_server.jobposting.dto;

import java.util.List;

public record JobPostingAnalysisResponse(
        Long analysisId,
        ExtractedJobPosting extracted,
        List<BusinessCandidate> businessCandidates,
        String imageUrl,
        List<ExternalRiskCheck> externalChecks,
        AnalysisSection businessDataAnalysis,
        AnalysisSection postingTextAnalysis,
        List<ConcernItem> concerns,
        String finalSummary,
        String userReport,
        boolean openAiUsed
) {
}
