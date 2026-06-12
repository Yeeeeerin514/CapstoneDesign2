package com.albasave.albasave_server.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private Long userId;
    private String name;
    private String email;
    /** 멘토 인증 여부(User.role). 클라이언트가 "🛡 인증멘토" 뱃지 판단에 사용. */
    @JsonProperty("isMentor")
    private boolean isMentor;
}
