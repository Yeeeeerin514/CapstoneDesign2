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

    /** 계약 시급 (원). 월급/일급제면 역산값 또는 null */
    @Column(name = "hourly_wage")
    private Integer hourlyWage;

    /** 분석 시점 기준 적용 최저시급 (스냅샷) */
    @Column(name = "minimum_wage_at_analysis")
    private Integer minimumWageAtAnalysis;

    // ─────────────────────────────────────────────────────────────────
    //  진정서 보강 — 임금체불 진정서 작성 시 실제 필요한 추가 정보
    // ─────────────────────────────────────────────────────────────────

    /** 계약 월급 (원) — 월급제일 때 */
    @Column(name = "monthly_wage")
    private Integer monthlyWage;

    /** 계약 종료일 (무기계약/미명시면 null) */
    @Column(name = "employment_end_date")
    private LocalDate employmentEndDate;

    /** 임금 지급일 — 계약서 원문 그대로 (예: "매월 5일") */
    @Column(name = "wage_payment_date", length = 50)
    private String wagePaymentDate;

    /** 임금 지급 방법 (예: "계좌이체") */
    @Column(name = "wage_payment_method", length = 30)
    private String wagePaymentMethod;

    /** 휴게 시작 시각 */
    @Column(name = "break_start_time")
    private LocalTime breakStartTime;

    /** 휴게 종료 시각 */
    @Column(name = "break_end_time")
    private LocalTime breakEndTime;

    /** 사업장 상호 */
    @Column(name = "employer_name", length = 200)
    private String employerName;

    /** 사업장 주소 */
    @Column(name = "employer_address", length = 500)
    private String employerAddress;

    /** 사업장 전화번호 */
    @Column(name = "employer_phone", length = 30)
    private String employerPhone;

    /** 사업주 대표자 성명 */
    @Column(name = "employer_representative", length = 100)
    private String employerRepresentative;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
