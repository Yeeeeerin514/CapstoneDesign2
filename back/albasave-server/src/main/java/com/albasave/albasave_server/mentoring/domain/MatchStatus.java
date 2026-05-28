package com.albasave.albasave_server.mentoring.domain;

/** MentorshipMatch 진행 상태. */
public enum MatchStatus {
    /** Gale-Shapley로 추천됐으나 멘티 확정 대기 */
    PROPOSED,
    /** 멘티가 결제·동의하여 매칭 확정 */
    ACTIVE,
    /** 사건 해결되어 종료 */
    COMPLETED,
    /** 멘티/멘토가 취소 */
    CANCELED
}
