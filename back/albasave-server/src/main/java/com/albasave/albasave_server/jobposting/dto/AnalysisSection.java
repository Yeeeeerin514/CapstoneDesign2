package com.albasave.albasave_server.jobposting.dto;

import java.util.List;

public record AnalysisSection(
        String title,
        String summary,
        List<ConcernItem> concerns
) {
}
