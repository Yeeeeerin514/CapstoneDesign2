package com.albasave.albasave_server.jobposting.repository;

import com.albasave.albasave_server.jobposting.domain.JobPostingAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingAnalysisRepository extends JpaRepository<JobPostingAnalysis, Long> {
}
