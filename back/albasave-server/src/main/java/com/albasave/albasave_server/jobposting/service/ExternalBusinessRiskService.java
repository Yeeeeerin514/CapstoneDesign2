package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.dto.BusinessCandidate;
import com.albasave.albasave_server.jobposting.dto.ExternalRiskCheck;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import com.albasave.albasave_server.juso.JusoApiClient;
import com.albasave.albasave_server.wagearrears.service.WageArrearsLookupService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ExternalBusinessRiskService {
    private final NtsBusinessStatusClient ntsBusinessStatusClient;
    private final WageArrearsLookupService wageArrearsLookupService;
    private final JusoApiClient jusoApiClient;

    public ExternalBusinessRiskService(
            NtsBusinessStatusClient ntsBusinessStatusClient,
            WageArrearsLookupService wageArrearsLookupService,
            JusoApiClient jusoApiClient
    ) {
        this.ntsBusinessStatusClient = ntsBusinessStatusClient;
        this.wageArrearsLookupService = wageArrearsLookupService;
        this.jusoApiClient = jusoApiClient;
    }

    public List<ExternalRiskCheck> check(ExtractedJobPosting posting, List<BusinessCandidate> candidates) {
        List<ExternalRiskCheck> checks = new ArrayList<>();
        String businessName = firstNonBlank(
                posting.businessName(),
                posting.brandName(),
                candidates.isEmpty() ? null : candidates.get(0).businessName()
        );
        checks.add(wageArrearsLookupService.check(businessName));
        checks.add(ntsBusinessStatusClient.check(posting.businessRegistrationNumber()));
        checks.add(jusoApiClient.check(posting.address()));
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
