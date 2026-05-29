package com.albasave.albasave_server.userinfo.dto;

import com.albasave.albasave_server.workinglog.domain.Day;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@NoArgsConstructor
public class PartTimeJobRegisterRequest {

    private String  businessRegistrationNum;  // 사업장 사업자등록번호
    private boolean isMon;
    private boolean isTue;
    private boolean isWed;
    private boolean isThu;
    private boolean isFri;
    private boolean isSat;
    private boolean isSun;
    private LocalTime startTime;              // 소정 근무 시작시간
    private LocalTime endTime;                // 소정 근무 종료시간
    private LocalDate startDay;               // 입사일
    private Integer hourlyWage;               // 약정 시급 (원)
    // contract(근로계약서 파일)는 별도 multipart로 업로드

    /**
     * boolean 7개 → bitmask Integer 변환 (Service에서 호출)
     * Day enum의 toBitmask() 활용
     */
    public int getDaysAsBitmask() {
        List<Day> selectedDays = new ArrayList<>();
        if (isMon) selectedDays.add(Day.MON);
        if (isTue) selectedDays.add(Day.TUE);
        if (isWed) selectedDays.add(Day.WED);
        if (isThu) selectedDays.add(Day.THU);
        if (isFri) selectedDays.add(Day.FRI);
        if (isSat) selectedDays.add(Day.SAT);
        if (isSun) selectedDays.add(Day.SUN);
        return Day.toBitmask(selectedDays);
    }
}
