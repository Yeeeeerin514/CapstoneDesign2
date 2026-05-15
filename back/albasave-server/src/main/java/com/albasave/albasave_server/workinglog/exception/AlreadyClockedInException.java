package com.albasave.albasave_server.workinglog.exception;

public class AlreadyClockedInException extends RuntimeException {
    public AlreadyClockedInException() {
        super("이미 출근 처리된 근무 기록이 있습니다.");
    }
}
