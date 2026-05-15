package com.albasave.albasave_server.workinglog.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * 사용자 테이블
 * DB 마이그레이션 필요: fcm_token 컬럼 추가
 *    ALTER TABLE "user" ADD COLUMN fcm_token VARCHAR(512);
 */
@Entity
@Table(name = "\"user\"") // PostgreSQL에서 user는 예약어이므로 충돌나지 않게
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(name = "home_address")
    private String homeAddress;

    @Column(name = "phone_number")
    private String phoneNumber;

    private String email;

    /**
     * FCM 디바이스 토큰 (푸시 알림용)
     * 로그인/앱 실행 시 프론트에서 발급받아 서버에 저장
     */
    @Column(name = "fcm_token")
    private String fcmToken;
}