package com.albasave.albasave_server.jobposting.controller;

import com.albasave.albasave_server.jobposting.dto.JobPostingAnalysisResponse;
import com.albasave.albasave_server.jobposting.service.JobPostingAnalysisService;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/job-postings")
public class JobPostingAnalysisController {
    private final JobPostingAnalysisService analysisService;

    public JobPostingAnalysisController(JobPostingAnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public JobPostingAnalysisResponse analyze(@RequestPart("image") @NotNull MultipartFile image) throws IOException {
        return analysisService.analyze(image);
    }

    @GetMapping("/analyses/{analysisId}")
    public JobPostingAnalysisResponse getAnalysis(@PathVariable Long analysisId) {
        return analysisService.getAnalysis(analysisId);
    }
}
