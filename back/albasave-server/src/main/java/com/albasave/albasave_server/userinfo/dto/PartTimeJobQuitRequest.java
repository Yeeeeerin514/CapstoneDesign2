package com.albasave.albasave_server.userinfo.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class PartTimeJobQuitRequest {

    private LocalDate endDay;         // 퇴사일
}
