package com.albasave.albasave_server.jobposting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "openai")
public record OpenAiProperties(
        String apiKey,
        String model,
        String baseUrl
) {
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
