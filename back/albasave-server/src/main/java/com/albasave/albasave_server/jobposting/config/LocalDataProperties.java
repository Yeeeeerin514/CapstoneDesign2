package com.albasave.albasave_server.jobposting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "albasave.local-data")
public record LocalDataProperties(
        String csvDirectory
) {
}
