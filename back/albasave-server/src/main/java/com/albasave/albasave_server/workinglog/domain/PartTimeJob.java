package com.albasave.albasave_server.workinglog.domain;

import com.albasave.albasave_server.business.domain.Business;

import com.albasave.albasave_server.userinfo.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 사용자의 알바 정보 테이블
 * ※ DB 마이그레이션 필요: bssid 컬럼 추가
 *    ALTER TABLE part_time_job ADD COLUMN bssid VARCHAR(255);
 *    ALTER TABLE part_time_job ADD COLUMN fcm_token VARCHAR(512); -- User 테이블에 넣어도 됨
 */
@Entity
@Table(name = "part_time_job")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartTimeJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;                      // User → PartTimeJob : 1:N 관계의 N쪽

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)   // DB 컬럼명 오타 그대로 유지
    private Business business;              // Business → PartTimeJob : 1:N 관계의 N쪽


    /**
     * 근무 요일 bitmask (MON=1, TUE=2, WED=4, THU=8, FRI=16, SAT=32, SUN=64)
     * 예: 월·수·금 → 1 | 4 | 16 = 21
     */
    @Column(name = "days", nullable = false)
    private Integer days;

    /** 예정 출근 시각 */
    @Column(name = "start_time")
    private LocalTime startTime;

    /** 예정 퇴근 시각 */
    @Column(name = "end_time")
    private LocalTime endTime;

    /** 현재 활성화된 알바 여부 */
    @Column(name = "is_active")
    private Boolean isActive;

    /** 알바 시작일 */
    @Column(name = "start_day")
    private LocalDate startDay;

    /** 알바 종료일 (아직 미정이면 null) */
    @Column(name = "end_day")
    private LocalDate endDay;

    /** 계약서 파일 경로 또는 URL */
    @Column(name = "contract")
    private String contract;

    /**해당 알바의 근무 업장 WiFi BSSID */
    @Column(name = "bssid")
    private String bssid;

    /** 업장 이름 */
    @Column(name = "business_name")
    private String businessName;

    /** 시급 (원) */
    @Column(name = "hourly_wage")
    private Integer hourlyWage;

    public void quit(LocalDate endDay) {
        this.isActive = false;
        this.endDay   = endDay;
 }
}