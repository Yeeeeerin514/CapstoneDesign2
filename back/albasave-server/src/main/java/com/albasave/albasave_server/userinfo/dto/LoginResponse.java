package com.albasave.albasave_server.userinfo.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponse {

    private Long userId;
    private String name;
    private String email;
    private String token;   // Bearer JWT
}
