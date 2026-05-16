package com.albasave.albasave_server.report.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ComplaintDraftResponse {
    private Long reportId;
    private String complaintDraft;
    private String submissionUrl;
}
