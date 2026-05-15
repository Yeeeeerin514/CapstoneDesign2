package com.albasave.albasave_server.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class FcmTokenRequest {
    @NotBlank
    private String fcmToken;
}
