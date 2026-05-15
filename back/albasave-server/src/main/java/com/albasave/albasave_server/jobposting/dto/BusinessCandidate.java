package com.albasave.albasave_server.jobposting.dto;

public record BusinessCandidate(
        String businessName,
        String address,
        String roadAddress,
        String industry,
        String businessStatus,
        String detailStatus,
        String licenseDate,
        String closureDate,
        String phone,
        String serviceId,
        String serviceName,
        String sourceFile,
        int matchScore
) {
}
