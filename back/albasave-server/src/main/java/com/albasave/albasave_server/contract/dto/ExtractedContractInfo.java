package com.albasave.albasave_server.contract.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExtractedContractInfo {
    /** 계약서에서 추출한 시급 (원). 시급 미명시 시 null */
    private Integer hourlyWage;

    /** 계약서에서 추출한 월급 (원). 월급제인 경우 */
    private Integer monthlyWage;

    /** 계약서에서 추출한 일급 (원). 일급제인 경우 */
    private Integer dailyWage;

    /** 서비스에서 월급/일급으로 역산한 시급 (JSON 역직렬화 대상 아님) */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Integer calculatedHourlyWage;

    public void setCalculatedHourlyWage(Integer v) { this.calculatedHourlyWage = v; }

    /** 시급(원): 명시 시급 → 역산 시급 순으로 반환. 둘 다 없으면 null */
    public Integer getEffectiveHourlyWage() {
        return hourlyWage != null ? hourlyWage : calculatedHourlyWage;
    }

    /**
     * 금액 규모 sanity 보정 — LLM이 시급/일급 라벨을 헷갈린 경우의 결정적 안전망.
     * '일급'으로 추출됐지만 1일치 임금으로 불가능하게 작은 값(3만원 미만)은
     * 시급 오분류로 보고 시급으로 옮긴다. (한국 최저시급 기준 3시간만 일해도 일급은 3만원 초과)
     */
    public void normalizeImplausibleDailyWage() {
        if (hourlyWage == null && dailyWage != null && dailyWage < 30000) {
            hourlyWage = dailyWage;
            dailyWage = null;
        }
    }

    /** 1일 소정근로시간 (휴게시간 제외 실제 근로시간) */
    private Double workingHoursPerDay;

    /** 주 근무일 수 */
    private Integer workingDaysPerWeek;

    /** 근무 시작일 (자유 텍스트, 진정서 입사일 정규화는 ContractFactSheet에서 LocalDate로) */
    private String startDate;

    /** 근무 장소 */
    private String workPlace;

    /** 업무 내용 */
    private String jobDescription;

    /** 주휴수당 명시 여부 */
    private Boolean weeklyHolidayAllowanceMentioned;

    /** 연장·야간수당 명시 여부 */
    private Boolean overtimeAllowanceMentioned;

    /** 연차유급휴가 명시 여부 */
    private Boolean annualLeaveMentioned;

    /** 휴게시간 명시 여부 (계약서에 휴게 시간대가 적혀 있으면 true) */
    private Boolean breakTimeMentioned;

    /** 고용주명 */
    private String employerName;

    /** 사업자등록번호 (하이픈 없는 10자리 권장) */
    private String businessRegistrationNumber;

    // ─────────────────────────────────────────────────────────────────
    //  진정서 작성에 사용되는 추가 추출 정보 (LLM이 String으로 반환,
    //  Service에서 LocalTime/LocalDate/DayOfWeek로 변환)
    // ─────────────────────────────────────────────────────────────────

    /** 근로 요일 — 영어 풀네임 대문자 배열 (예: ["MONDAY","TUESDAY","FRIDAY"]) */
    private List<String> workDays;

    /** 1일 근로 시작 시각 — HH:mm (예: "09:00") */
    private String workStartTime;

    /** 1일 근로 종료 시각 — HH:mm (예: "18:00") */
    private String workEndTime;

    /** 입사일 — yyyy-MM-dd (예: "2026-04-01") */
    private String employmentStartDate;

    // ─────────────────────────────────────────────────────────────────
    //  진정서 보강 — 임금체불 진정서 작성 시 실제 필요한 추가 정보
    // ─────────────────────────────────────────────────────────────────

    /** 계약 종료일 — yyyy-MM-dd. 무기계약이거나 미명시면 null */
    private String contractEndDate;

    /**
     * 임금 지급일 — 계약서 원문 그대로 (예: "매월 5일", "매월 말일", "다음달 10일").
     * 진정서 체불 시점 계산에 필수.
     */
    private String wagePaymentDate;

    /** 임금 지급방법 — 예: "계좌이체", "직접지급" */
    private String wagePaymentMethod;

    /** 휴게 시작 시각 — HH:mm (예: "12:00") */
    private String breakStartTime;

    /** 휴게 종료 시각 — HH:mm (예: "13:00") */
    private String breakEndTime;

    /** 사업장 주소 — 진정서 피진정인 주소 */
    private String employerAddress;

    /** 사업장 전화번호 — 진정서 피진정인 연락처 */
    private String employerPhone;

    /** 사업주 대표자 성명 — 진정서 피진정인 성명 */
    private String employerRepresentative;
}
