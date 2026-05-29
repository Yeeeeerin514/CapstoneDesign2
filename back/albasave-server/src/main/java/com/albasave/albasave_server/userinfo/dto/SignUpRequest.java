package com.albasave.albasave_server.userinfo.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SignUpRequest {

    private String name;
    private String email;
    private String password;
}
