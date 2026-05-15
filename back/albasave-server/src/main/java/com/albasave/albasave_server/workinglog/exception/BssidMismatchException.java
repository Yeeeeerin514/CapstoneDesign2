package com.albasave.albasave_server.workinglog.exception;

public class BssidMismatchException extends RuntimeException {
    public BssidMismatchException() {
        super("등록된 업장 WiFi와 현재 연결된 WiFi가 일치하지 않습니다.");
    }
}
