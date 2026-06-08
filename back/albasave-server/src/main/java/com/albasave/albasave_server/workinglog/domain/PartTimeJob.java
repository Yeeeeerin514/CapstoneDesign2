package com.albasave.albasave_server.workinglog.domain;

import com.albasave.albasave_server.business.domain.Business;

import com.albasave.albasave_server.userinfo.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

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

    // nullable 허용: register-workplace 흐름은 사업장명만 받고 Business 엔티티를 생성하지 않으므로
    // business 없이 PartTimeJob을 저장한다. NOT NULL 이면 INSERT 시 제약 위반으로 500이 발생한다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id")
    private Business business;              // Business → PartTimeJob : 1:N 관계의 N쪽


    /**
     * 근무 요일 bitmask (MON=1, TUE=2, WED=4, THU=8, FRI=16, SAT=32, SUN=64)
     * 예: 월·수·금 → 1 | 4 | 16 = 21
     */
    // nullable 허용: 기존 데이터가 있는 테이블에 ddl-auto=update 가 NOT NULL 컬럼을 추가하지 못하는 문제 회피
    @Column(name = "days")
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