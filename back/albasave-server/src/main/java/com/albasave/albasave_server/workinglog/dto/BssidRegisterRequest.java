package com.albasave.albasave_server.workinglog.dto;

import lombok.Getter;
import lombok.Setter;

// ─────────────────────────────────────────────
//  업장 WiFi BSSID 등록 요청 DTO
//  출퇴근 기록 기능 최초 활성화 시 사용
// ─────────────────────────────────────────────
@Getter
@Setter
public class BssidRegisterRequest {

    /**
     * 등록할 WiFi의 BSSID
     * 프론트에서 사용자가 업장 WiFi에 연결된 상태에서 현재 BSSID를 읽어 전달
     */
    private String bssid;
}