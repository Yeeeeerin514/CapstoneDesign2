package com.albasave.albasave_server.lawapi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "albasave.law-api")
public record LawApiProperties(String oc, String baseUrl) {
    public boolean isConfigured() {
        return oc != null && !oc.isBlank();
    }
}
