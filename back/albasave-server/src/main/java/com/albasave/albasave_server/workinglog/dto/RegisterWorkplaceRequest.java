package com.albasave.albasave_server.workinglog.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

// ─────────────────────────────────────────────
//  사업장 통합 등록 요청 DTO — BSSID 등록 화면 완료 시 사용.
//  기존 {workplaceName, bssid, ssid}에 더해 근무 정보(요일/시간/시급)도 함께 받아
//  PartTimeJob 의 schedule/wage 컬럼까지 채운다. (이전엔 days(0) 하드코딩이라 비어 있었음)
//  근무 정보 필드는 모두 선택 — 미전송 시 null 로 저장(기존 동작과 호환).
// ─────────────────────────────────────────────
@Getter
@Setter
public class RegisterWorkplaceRequest {

    /** PartTimeJob.businessName 으로 저장. */
    private String workplaceName;

    /** 필수 — 없으면 400. */
    private String bssid;

    /** 선택 — 저장하지 않고 전달만(현재 미사용). */
    private String ssid;

    /** 근무 요일 — DayOfWeek 이름 배열. 예: ["MONDAY","WEDNESDAY"]. */
    private List<String> workDays;

    /** 예정 출근 시각 "HH:mm". 예: "09:00". */
    private String workStartTime;

    /** 예정 퇴근 시각 "HH:mm". 예: "18:00". */
    private String workEndTime;

    /** 알바 시작일 "yyyy-MM-dd". 예: "2026-06-08". */
    private String startDay;

    /** 시급(원). 미입력이면 null. */
    private Integer hourlyWage;

    /**
     * workDays(DayOfWeek 이름 목록) → PartTimeJob.days 커스텀 비트마스크.
     * MON=1, TUE=2, WED=4, THU=8, FRI=16, SAT=32, SUN=64 (bit = DayOfWeek.getValue()-1).
     * 비었거나 유효 요일이 없으면 null.
     */
    public Integer toDaysBitmask() {
        if (workDays == null || workDays.isEmpty()) {
            return null;
        }
        int mask = 0;
        for (String day : workDays) {
            if (day == null || day.isBlank()) {
                continue;
            }
            try {
                DayOfWeek dow = DayOfWeek.valueOf(day.trim().toUpperCase());
                mask |= 1 << (dow.getValue() - 1);
            } catch (IllegalArgumentException ignored) {
                // 알 수 없는 요일 문자열은 건너뜀
            }
        }
        return mask == 0 ? null : mask;
    }

    /** "HH:mm" → LocalTime. 비었거나 형식 오류면 null. */
    public LocalTime toStartTime() {
        return parseTime(workStartTime);
    }

    /** "HH:mm" → LocalTime. 비었거나 형식 오류면 null. */
    public LocalTime toEndTime() {
        return parseTime(workEndTime);
    }

    /** "yyyy-MM-dd" → LocalDate. 비었거나 형식 오류면 null. */
    public LocalDate toStartDay() {
        if (startDay == null || startDay.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(startDay.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalTime.parse(value.trim());
        } catch (Exception e) {
            return null;
        }
    }
}
