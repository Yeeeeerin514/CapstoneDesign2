package com.albasave.albasave_server.jobposting.dto;

public record ConcernItem(
        String type,
        String severity,
        String title,
        String description,
        String evidence
) {
}
