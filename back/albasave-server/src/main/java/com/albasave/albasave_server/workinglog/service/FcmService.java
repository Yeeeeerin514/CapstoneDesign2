package com.albasave.albasave_server.workinglog.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
public class FcmService {
    @Value("${fcm.server-key:}")
    private String serverKey;

    private static final String FCM_URL = "https://fcm.googleapis.com/fcm/send";

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendPushNotification(String fcmToken, String title, String body) {
        if (fcmToken == null || fcmToken.isBlank() || serverKey == null || serverKey.isBlank()) {
            log.warn("[FCM] token or server key is missing. notification skipped.");
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

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    FCM_URL,
                    new HttpEntity<>(payload, headers),
                    String.class
            );
            log.info("[FCM] notification sent. status={}", response.getStatusCode());
        } catch (Exception exception) {
            log.error("[FCM] notification failed. error={}", exception.getMessage());
        }
    }

    public void sendClockInReminder(String fcmToken, String jobName) {
        sendPushNotification(fcmToken, "출근 시간이에요", jobName + " 출근 시간입니다. 출근하기 버튼을 눌러주세요.");
    }

    public void sendClockOutReminder(String fcmToken, String jobName) {
        sendPushNotification(fcmToken, "퇴근 시간이에요", jobName + " 퇴근 시간입니다. 지금 퇴근 처리해주세요.");
    }
}
