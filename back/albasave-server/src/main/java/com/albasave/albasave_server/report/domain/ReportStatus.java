package com.albasave.albasave_server.report.domain;

/**
 * 신고 사건 상태 — 프론트 ReportStatus와 동일한 UPPER_CASE 문자열로 직렬화된다.
 * 신규 draft는 항상 PENDING으로 시작.
 */
public enum ReportStatus {
    PENDING,             // 접수 대기 (작성 중)
    INSPECTING,          // 조사 중
    CORRECTION_ORDERED,  // 시정 명령
    RESOLVED,            // 해결 완료
    UNRESOLVED           // 미해결
}
