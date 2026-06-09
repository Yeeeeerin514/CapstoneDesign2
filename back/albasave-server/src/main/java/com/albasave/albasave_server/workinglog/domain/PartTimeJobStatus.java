package com.albasave.albasave_server.workinglog.domain;

/**
 * PartTimeJob 의 라이프사이클 상태.
 *
 * - FAVORITE   : 공고문 분석으로 자동 저장된 "관심업장" 후보. 아직 알바로 등록되지 않음.
 *                근무 정보(요일/시간/시급)는 공고 분석 추출값으로 prefill 되어 있으나 BSSID는 없음.
 * - REGISTERED : BSSID 등록까지 마친 "실제 근무 업장(알바)". 출퇴근 기록 대상.
 *
 * 관심업장 → 알바 등록은 같은 행의 status 를 FAVORITE → REGISTERED 로 전이시킨다(새 행 생성 X).
 */
public enum PartTimeJobStatus {
    FAVORITE,
    REGISTERED
}
