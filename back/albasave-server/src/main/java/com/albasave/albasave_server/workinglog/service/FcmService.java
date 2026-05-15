package com.albasave.albasave_server.workinglog.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * FCM(Firebase Cloud Messaging) 푸시 알림 서비스
 *
 * [사전 설정 필요]
 * 1. Firebase 프로젝트 생성 후 서비스 계정 키(JSON) 발급
 * 2. application.yml에 fcm.server-key 설정
 * 3. 프론트에서 앱 시작 시 FCM 디바이스 토큰을 발급받아
 *    서버의 /api/users/{id}/fcm-token API로 전송 (User.fcmToken에 저장)
 *
 * ※ 실제 프로덕션에서는 firebase-admin SDK 사용을 권장
 *    (google-auth-library 기반의 OAuth2 토큰 방식)
 */
@Slf4j
@Service
public class FcmService {

    @Value("${fcm.server-key}")
    private String serverKey;

    private static final String FCM_URL = "https://fcm.googleapis.com/fcm/send";

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 단일 디바이스에 푸시 알림 전송
     *
     * @param fcmToken  수신 대상의 FCM 토큰
     * @param title     알림 제목
     * @param body      알림 내용
     */
    public void sendPushNotification(String fcmToken, String title, String body) {
        if (fcmToken == null || fcmToken.isBlank()) {
            log.warn("[FCM] FCM 토큰이 없어 알림을 전송하지 않습니다.");
            return;
        }

        Map<String, Object> payload = Map.of(
                "to", fcmToken,
                "notification", Map.of(
                        "title", title,
                        "body", body,
                        "sound", "default"
                ),
                "data", Map.of(
                        "title", title,
                        "body", body
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "key=" + serverKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(FCM_URL, entity, String.class);
            log.info("[FCM] 알림 전송 완료. status={}, body={}", response.getStatusCode(), response.getBody());
        } catch (Exception e) {
            log.error("[FCM] 알림 전송 실패. fcmToken={}, error={}", fcmToken, e.getMessage());
        }
    }

    /** 출근 알림 */
    public void sendClockInReminder(String fcmToken, String jobName) {
        sendPushNotification(fcmToken,
                "출근 시간이에요! ⏰",
                jobName + " 알바 출근 시간입니다. 출근하기 버튼을 눌러주세요.");
    }

    /** 퇴근 알림 */
    public void sendClockOutReminder(String fcmToken, String jobName) {
        sendPushNotification(fcmToken,
                "퇴근 시간이에요! 🏠",
                jobName + " 알바 퇴근 시간입니다. 지금 퇴근하시겠어요?");
    }
}