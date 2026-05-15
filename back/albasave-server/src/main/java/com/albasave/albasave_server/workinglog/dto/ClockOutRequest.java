package com.albasave.albasave_server.workinglog.dto;

import lombok.Getter;
import lombok.Setter;

// ─────────────────────────────────────────────
//  퇴근 요청 DTO
// ─────────────────────────────────────────────
@Getter
@Setter
public class ClockOutRequest {

    /** 퇴근 처리할 Working 레코드 ID */
    private Long workingId;

    /**
     * 현재 연결된 WiFi의 BSSID (프론트에서 수집)
     * 업장 내 WiFi 범위에 있는지 검증에 사용
     */
    private String bssid;
}