package com.albasave.albasave_server.jobposting.dto;

import java.util.List;

public record JobPostingAnalysisResponse(
        ExtractedJobPosting extracted,
        List<BusinessCandidate> businessCandidates,
        List<ConcernItem> concerns,
        String userReport,
        boolean openAiUsed
) {
}
