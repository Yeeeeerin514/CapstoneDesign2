package com.albasave.albasave_server.jobposting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "albasave.public-api")
public record PublicApiProperties(
        Work24 work24,
        Nts nts,
        Sbiz sbiz
) {
    public record Work24(String authKey, String wageArrearsUrl) {
        public boolean isConfigured() {
            return authKey != null && !authKey.isBlank();
        }
    }

    public record Nts(String serviceKey, String statusUrl) {
        public boolean isConfigured() {
            return serviceKey != null && !serviceKey.isBlank();
        }
    }

    public record Sbiz(String serviceKey) {
        public boolean isConfigured() {
            return serviceKey != null && !serviceKey.isBlank();
        }
    }
}
