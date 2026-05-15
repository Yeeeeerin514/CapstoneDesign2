package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.dto.BusinessCandidate;
import com.albasave.albasave_server.jobposting.dto.ExternalRiskCheck;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ExternalBusinessRiskService {
    private final NtsBusinessStatusClient ntsBusinessStatusClient;
    private final Work24WageArrearsClient work24WageArrearsClient;

    public ExternalBusinessRiskService(
            NtsBusinessStatusClient ntsBusinessStatusClient,
            Work24WageArrearsClient work24WageArrearsClient
    ) {
        this.ntsBusinessStatusClient = ntsBusinessStatusClient;
        this.work24WageArrearsClient = work24WageArrearsClient;
    }

    public List<ExternalRiskCheck> check(ExtractedJobPosting posting, List<BusinessCandidate> candidates) {
        List<ExternalRiskCheck> checks = new ArrayList<>();
        String businessName = firstNonBlank(
                posting.businessName(),
                posting.brandName(),
                candidates.isEmpty() ? null : candidates.get(0).businessName()
        );
        checks.add(work24WageArrearsClient.check(businessName));
        checks.add(ntsBusinessStatusClient.check(posting.businessRegistrationNumber()));
        return checks;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
