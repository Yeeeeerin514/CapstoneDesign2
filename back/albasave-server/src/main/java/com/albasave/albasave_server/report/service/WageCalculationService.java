package com.albasave.albasave_server.report.service;

import com.albasave.albasave_server.workinglog.domain.Working;
import com.albasave.albasave_server.workinglog.repository.WorkingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WageCalculationService {

    private final WorkingRepository workingRepository;

    /** 2026년 최저시급 (원) */
    public static final int MINIMUM_WAGE_2026 = 10030;

    /**
     * 특정 알바에 대해 실제 받아야 할 총 임금을 계산
     *
     * @param partTimeJobId 알바 ID
     * @param hourlyWage    계약 시급 (0이면 최저시급 사용)
     * @return 임금 계산 결과
     */
    public WageCalculationResult calculate(Long partTimeJobId, int hourlyWage) {
        if (hourlyWage <= 0) hourlyWage = MINIMUM_WAGE_2026;

        List<Working> records = workingRepository
                .findByPartTimeJobIdOrderByRealStartTimeDesc(partTimeJobId)
                .stream()
                .filter(w -> w.getRealStartTime() != null && w.getRealEndTime() != null)
                .toList();

        if (records.isEmpty()) {
            return WageCalculationResult.empty(hourlyWage);
        }

        // 주(week)별로 그룹핑
        Map<LocalDate, List<Working>> byWeek = records.stream()
                .collect(Collectors.groupingBy(w ->
                        w.getRealStartTime().toLocalDate()
                                .with(DayOfWeek.MONDAY)));

        long totalBasePay = 0;
        long totalOvertimePay = 0;
        long totalNightPay = 0;
        long totalWeeklyHolidayPay = 0;
        long totalWorkMinutes = 0;

        for (Map.Entry<LocalDate, List<Working>> entry : byWeek.entrySet()) {
            List<Working> weekRecords = entry.getValue();

            long weekMinutes = 0;
            long weekNightMinutes = 0;

            for (Working w : weekRecords) {
                long minutes = Duration.between(w.getRealStartTime(), w.getRealEndTime()).toMinutes();
                weekMinutes += minutes;
                weekNightMinutes += countNightMinutes(w.getRealStartTime(), w.getRealEndTime());
            }

            totalWorkMinutes += weekMinutes;

            double weekHours = weekMinutes / 60.0;
            double weekNightHours = weekNightMinutes / 60.0;

            // 기본급 (주 40시간까지)
            double baseHours = Math.min(weekHours, 40.0);
            totalBasePay += Math.round(baseHours * hourlyWage);

            // 연장수당 (주 40시간 초과분, 1.5배)
            if (weekHours > 40.0) {
                double overtimeHours = weekHours - 40.0;
                totalOvertimePay += Math.round(overtimeHours * hourlyWage * 0.5);
            }

            // 야간수당 (22:00~06:00 근무, 0.5배 추가)
            totalNightPay += Math.round(weekNightHours * hourlyWage * 0.5);

            // 주휴수당 (주 15시간 이상 근무 시)
            if (weekHours >= 15.0) {
                double avgDailyHours = weekHours / countWorkDays(weekRecords);
                totalWeeklyHolidayPay += Math.round(avgDailyHours * hourlyWage);
            }
        }

        long totalShouldReceive = totalBasePay + totalOvertimePay + totalNightPay + totalWeeklyHolidayPay;

        return WageCalculationResult.builder()
                .hourlyWage(hourlyWage)
                .totalWorkMinutes(totalWorkMinutes)
                .totalBasePay(totalBasePay)
                .totalOvertimePay(totalOvertimePay)
                .totalNightPay(totalNightPay)
                .totalWeeklyHolidayPay(totalWeeklyHolidayPay)
                .totalShouldReceive(totalShouldReceive)
                .minimumWage(MINIMUM_WAGE_2026)
                .build();
    }

    /** 최저임금 기준 체불 여부 확인 */
    public long calculateUnpaidAmount(long actualReceivedAmount, WageCalculationResult result) {
        long deficit = result.getTotalShouldReceive() - actualReceivedAmount;
        return Math.max(0, deficit);
    }

    /** 22:00 ~ 06:00 사이의 야간 근무 분수 계산 */
    private long countNightMinutes(LocalDateTime start, LocalDateTime end) {
        long nightMinutes = 0;
        LocalDateTime cursor = start;
        while (cursor.isBefore(end)) {
            LocalDateTime next = cursor.plusMinutes(1);
            int hour = cursor.getHour();
            if (hour >= 22 || hour < 6) {
                nightMinutes++;
            }
            cursor = next;
        }
        return nightMinutes;
    }

    private int countWorkDays(List<Working> records) {
        long distinct = records.stream()
                .map(w -> w.getRealStartTime().toLocalDate())
                .distinct()
                .count();
        return (int) Math.max(1, distinct);
    }

    @lombok.Builder
    @lombok.Getter
    public static class WageCalculationResult {
        private final int hourlyWage;
        private final long totalWorkMinutes;
        private final long totalBasePay;
        private final long totalOvertimePay;
        private final long totalNightPay;
        private final long totalWeeklyHolidayPay;
        private final long totalShouldReceive;
        private final int minimumWage;

        public static WageCalculationResult empty(int hourlyWage) {
            return WageCalculationResult.builder()
                    .hourlyWage(hourlyWage)
                    .totalWorkMinutes(0)
                    .totalBasePay(0)
                    .totalOvertimePay(0)
                    .totalNightPay(0)
                    .totalWeeklyHolidayPay(0)
                    .totalShouldReceive(0)
                    .minimumWage(MINIMUM_WAGE_2026)
                    .build();
        }
    }
}
