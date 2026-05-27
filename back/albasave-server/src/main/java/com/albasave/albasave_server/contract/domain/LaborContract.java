package com.albasave.albasave_server.contract.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "labor_contract")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LaborContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "part_time_job_id")
    private Long partTimeJobId;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "analysis_json", columnDefinition = "TEXT")
    private String analysisJson;

    /** 위반 여부 요약 */
    @Column(name = "has_violation")
    private Boolean hasViolation;

    // ─────────────────────────────────────────────────────────────────
    //  진정서 작성에 사용되는 정형 데이터 (별도 컬럼 영속)
    //  진정서 팀원: laborContractRepository.findById(id)로 바로 접근 가능
    // ─────────────────────────────────────────────────────────────────

    /** 사업자등록번호 (10자리 숫자, 하이픈 없음) */
    @Column(name = "business_registration_number", length = 20)
    private String businessRegistrationNumber;

    /** 근로 요일 (List&lt;DayOfWeek&gt;를 CSV로 저장) */
    @Convert(converter = WorkDayListConverter.class)
    @Column(name = "work_days", length = 100)
    @Builder.Default
    private List<DayOfWeek> workDays = new ArrayList<>();

    /** 1일 근로 시작 시각 (예: 09:00) */
    @Column(name = "work_start_time")
    private LocalTime workStartTime;

    /** 1일 근로 종료 시각 (예: 18:00) */
    @Column(name = "work_end_time")
    private LocalTime workEndTime;

    /** 입사일 (근로 시작 날짜) */
    @Column(name = "employment_start_date")
    private LocalDate employmentStartDate;

    /** 계약 시급 (원) */
    @Column(name = "hourly_wage")
    private Integer hourlyWage;

    /** 분석 시점 기준 적용 최저시급 (스냅샷) */
    @Column(name = "minimum_wage_at_analysis")
    private Integer minimumWageAtAnalysis;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
