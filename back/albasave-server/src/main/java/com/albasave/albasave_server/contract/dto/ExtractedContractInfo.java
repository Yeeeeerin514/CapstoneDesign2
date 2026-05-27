package com.albasave.albasave_server.contract.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExtractedContractInfo {
    /** 계약서에서 추출한 시급 (원) */
    private Integer hourlyWage;

    /** 1일 소정근로시간 */
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
