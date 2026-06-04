package com.albasave.albasave_server.report.exception;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * 신고 도메인 전용 예외 처리.
 * 전역 핸들러의 generic Exception 핸들러보다 먼저 평가되도록 최우선 순위로 둔다.
 * 응답 본문은 전역 규약과 동일하게 {error: "..."}.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
public class ReportExceptionHandler {

    @ExceptionHandler(ReportAccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(ReportAccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", e.getMessage()));
    }
}
