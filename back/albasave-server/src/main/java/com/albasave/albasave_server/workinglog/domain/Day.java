package com.albasave.albasave_server.workinglog.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.DayOfWeek;
import java.util.List;

@Getter
@RequiredArgsConstructor
public enum Day {

    MON(1,   "월", DayOfWeek.MONDAY),
    TUE(2,   "화", DayOfWeek.TUESDAY),
    WED(4,   "수", DayOfWeek.WEDNESDAY),
    THU(8,   "목", DayOfWeek.THURSDAY),
    FRI(16,  "금", DayOfWeek.FRIDAY),
    SAT(32,  "토", DayOfWeek.SATURDAY),
    SUN(64,  "일", DayOfWeek.SUNDAY);

    private final int       bit;        // DB 저장용 bitmask 값
    private final String    display;    // 한국어 표기
    private final DayOfWeek dayOfWeek;  // java.time 연동용

    // JSON 직렬화: "MON" 형태로 출력
    @JsonValue
    public String getCode() {
        return this.name();
    }

    // JSON 역직렬화: "MON" → Day.MON
    @JsonCreator
    public static Day from(String code) {
        for (Day day : values()) {
            if (day.name().equalsIgnoreCase(code)) {
                return day;
            }
        }
        throw new IllegalArgumentException("유효하지 않은 요일 코드입니다: " + code);
    }

    // java.time.DayOfWeek → Day (오늘 요일 조회 시 사용)
    public static Day fromDayOfWeek(DayOfWeek dayOfWeek) {
        for (Day day : values()) {
            if (day.dayOfWeek == dayOfWeek) {
                return day;
            }
        }
        throw new IllegalArgumentException("매핑 실패: " + dayOfWeek);
    }

    // List<Day> → bitmask Integer (DB 저장용)
    public static int toBitmask(List<Day> days) {
        return days.stream()
                .mapToInt(Day::getBit)
                .reduce(0, (a, b) -> a | b);
    }

    // bitmask Integer → 오늘 요일 포함 여부 판단
    public static boolean containsToday(int bitmask, DayOfWeek today) {
        Day todayDay = fromDayOfWeek(today);
        return (bitmask & todayDay.getBit()) != 0;
    }
}
