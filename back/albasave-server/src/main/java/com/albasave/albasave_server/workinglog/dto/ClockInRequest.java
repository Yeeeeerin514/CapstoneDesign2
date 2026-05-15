package com.albasave.albasave_server.workinglog.dto;

import lombok.Getter;
import lombok.Setter;

// ─────────────────────────────────────────────
//  출근 요청 DTO
//  프론트에서 현재 연결된 WiFi의 BSSID를 직접 수집해서 전달
// ─────────────────────────────────────────────
@Getter
@Setter
public class ClockInRequest {

    /** 출근할 알바 ID */
    private Long partTimeJobId;

    /**
     * 현재 연결된 WiFi의 BSSID (프론트에서 수집)
     * Android: WifiManager.getConnectionInfo().getBSSID()
     * iOS: NEHotspotNetwork.fetchCurrent() 등
     */
    private String bssid;
}