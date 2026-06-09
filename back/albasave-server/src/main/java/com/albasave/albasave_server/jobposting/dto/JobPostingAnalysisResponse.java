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
        boolean openAiUsed,
        /** 이 분석으로 자동 생성/갱신된 관심업장(PartTimeJob status=FAVORITE) id. 저장 안 됐으면 null. */
        Long favoritePartTimeJobId
) {
}
