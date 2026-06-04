package com.albasave.albasave_server.report.exception;

/** 본인 소유가 아닌 신고 사건에 접근/수정 시도. → 403 */
public class ReportAccessDeniedException extends RuntimeException {
    public ReportAccessDeniedException(String message) {
        super(message);
    }
}
