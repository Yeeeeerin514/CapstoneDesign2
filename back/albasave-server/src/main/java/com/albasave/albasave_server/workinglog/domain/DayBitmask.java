package com.albasave.albasave_server.workinglog.domain;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;

/**
 * PartTimeJob.days 비트마스크 변환 유틸.
 * 규칙: bit = DayOfWeek.getValue()-1 → MON=1, TUE=2, WED=4, THU=8, FRI=16, SAT=32, SUN=64.
 */
public final class DayBitmask {

    private DayBitmask() {
    }

    /** 비트마스크 → DayOfWeek 이름 배열(월→일 순). null/0 이면 빈 리스트. */
    public static List<String> toDayNames(Integer days) {
        List<String> result = new ArrayList<>();
        if (days == null || days == 0) {
            return result;
        }
        for (DayOfWeek dow : DayOfWeek.values()) {
            if ((days & (1 << (dow.getValue() - 1))) != 0) {
                result.add(dow.name());
            }
        }
        return result;
    }
}
