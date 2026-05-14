package com.albasave.albasave_server.jobposting.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "job_posting_analyses")
public class JobPostingAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private boolean openAiUsed;

    @Column(length = 100)
    private String topBusinessName;

    @Column(length = 100)
    private String topBusinessStatus;

    @Lob
    private String extractedJson;

    @Lob
    private String candidatesJson;

    @Lob
    private String concernsJson;

    @Lob
    private String report;

    private Instant createdAt;

    protected JobPostingAnalysis() {
    }

    public JobPostingAnalysis(
            boolean openAiUsed,
            String topBusinessName,
            String topBusinessStatus,
            String extractedJson,
            String candidatesJson,
            String concernsJson,
            String report
    ) {
        this.openAiUsed = openAiUsed;
        this.topBusinessName = topBusinessName;
        this.topBusinessStatus = topBusinessStatus;
        this.extractedJson = extractedJson;
        this.candidatesJson = candidatesJson;
        this.concernsJson = concernsJson;
        this.report = report;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }
}
