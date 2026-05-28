package com.albasave.albasave_server.mentoring.domain;

/**
 * 멘토 자격 검증 방식.
 * 멘토 풀의 신뢰성을 보장하기 위해, 검증 방식을 명시적으로 기록한다.
 */
public enum VerificationMethod {
    /** 우리 앱에서 신고 사건을 해결한 사람 (verifiedCaseIds에 해당 사건 ID 보유) */
    RESOLVED_CASE("앱 내 해결 경험"),

    /** 외부 증빙 자료 업로드 (시정지시서·입금증·합의서 등) */
    EVIDENCE_UPLOAD("증빙 자료 업로드"),

    /** 관리자 수동 승인 (예외 케이스) */
    ADMIN_VERIFIED("관리자 승인");

    private final String label;

    VerificationMethod(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
