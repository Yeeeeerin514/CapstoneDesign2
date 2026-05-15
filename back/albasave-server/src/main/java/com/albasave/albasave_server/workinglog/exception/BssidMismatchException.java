package com.albasave.albasave_server.workinglog.exception;

public class BssidMismatchException extends RuntimeException{

    public BssidMismatchException() {
        super("업장 WiFi(BSSID)와 일치하지 않습니다. 업장 내에서 다시 시도해주세요.");
    }
}
