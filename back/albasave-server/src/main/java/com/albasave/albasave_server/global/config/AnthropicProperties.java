package com.albasave.albasave_server.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "anthropic")
public record AnthropicProperties(
        String apiKey,
        String model,
        String baseUrl
) {
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
