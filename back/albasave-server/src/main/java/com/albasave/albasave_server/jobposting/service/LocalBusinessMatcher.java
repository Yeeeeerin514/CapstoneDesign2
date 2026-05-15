package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.dto.BusinessCandidate;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class LocalBusinessMatcher {
    public List<BusinessCandidate> findCandidates(ExtractedJobPosting posting) {
        return List.of();
    }
}
