package com.albasave.albasave_server.juso;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 도로명주소 검색 API (juso.go.kr) 설정.
 */
@ConfigurationProperties(prefix = "albasave.juso")
public record JusoProperties(String confmKey, String baseUrl) {
    public boolean isConfigured() {
        return confmKey != null && !confmKey.isBlank();
    }
}
