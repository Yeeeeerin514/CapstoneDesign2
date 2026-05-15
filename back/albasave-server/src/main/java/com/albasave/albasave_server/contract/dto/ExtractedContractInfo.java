package com.albasave.albasave_server.contract.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

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

    /** 근무 시작일 */
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

    /** 사업자등록번호 */
    private String businessRegistrationNumber;
}
