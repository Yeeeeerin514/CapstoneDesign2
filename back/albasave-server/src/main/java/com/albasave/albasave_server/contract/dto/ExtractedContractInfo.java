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
}
