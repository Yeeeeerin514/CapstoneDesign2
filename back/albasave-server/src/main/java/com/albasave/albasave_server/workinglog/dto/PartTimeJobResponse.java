package com.albasave.albasave_server.workinglog.dto;

import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Builder
public class PartTimeJobResponse {
    private Long id;
    private Long businessId;
    private String businessName;
    private Integer hourlyWage;
    private String day;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate startDay;
    private LocalDate endDay;
    private Boolean isActive;
    private String bssid;
    private String contract;

    private static final String[] DAY_NAMES = {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"};

    public static PartTimeJobResponse from(PartTimeJob job) {
        return PartTimeJobResponse.builder()
                .id(job.getId())
                .businessId(job.getBusiness() != null ? job.getBusiness().getId() : null)
                .businessName(job.getBusinessName())
                .hourlyWage(job.getHourlyWage())
                .day(bitmaskToDayString(job.getDays()))
                .startTime(job.getStartTime())
                .endTime(job.getEndTime())
                .startDay(job.getStartDay())
                .endDay(job.getEndDay())
                .isActive(job.getIsActive())
                .bssid(job.getBssid())
                .contract(job.getContract())
                .build();
    }

    /** 비트마스크(MON=1, TUE=2, WED=4, THU=8, FRI=16, SAT=32, SUN=64) → "MON,TUE,..." 문자열 */
    public static String bitmaskToDayString(Integer days) {
        if (days == null || days == 0) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 7; i++) {
            if ((days & (1 << i)) != 0) {
                if (sb.length() > 0) sb.append(",");
                sb.append(DAY_NAMES[i]);
            }
        }
        return sb.toString();
    }

    /** "MON,TUE,..." 또는 "MONDAY,..." 문자열 → 비트마스크. null/빈 값은 0 */
    public static int dayStringToBitmask(String day) {
        if (day == null || day.isBlank()) return 0;
        int mask = 0;
        for (String token : day.split(",")) {
            String t = token.trim().toUpperCase();
            if (t.length() > 3) t = t.substring(0, 3);
            for (int i = 0; i < 7; i++) {
                if (DAY_NAMES[i].equals(t)) {
                    mask |= (1 << i);
                    break;
                }
            }
        }
        return mask;
    }
}
