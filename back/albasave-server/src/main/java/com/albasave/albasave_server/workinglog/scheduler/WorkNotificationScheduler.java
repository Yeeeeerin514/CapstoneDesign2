package com.albasave.albasave_server.workinglog.scheduler;

import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import com.albasave.albasave_server.workinglog.domain.User;
import com.albasave.albasave_server.workinglog.repository.PartTimeJobRepository;
import com.albasave.albasave_server.workinglog.repository.UserRepository;
import com.albasave.albasave_server.workinglog.service.FcmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 출퇴근 알림 스케줄러
 *
 * 매 1분마다 전체 활성 알바를 순회하며
 * - 출근 시각에 맞는 사용자 → 출근 알림
 * - 퇴근 시각에 맞는 사용자 → 퇴근 알림
 *
 * [스케줄러 활성화]
 * Application 클래스에 @EnableScheduling 추가 필요
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkNotificationScheduler {

    private final PartTimeJobRepository partTimeJobRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    /**
     * 매 분 0초에 실행 (정각 기준)
     * cron = "초 분 시 일 월 요일"
     */
    @Scheduled(cron = "0 * * * * *")
    public void checkAndSendNotifications() {
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        DayOfWeek today = LocalDate.now().getDayOfWeek();

        List<PartTimeJob> activeJobs = partTimeJobRepository.findAllByIsActiveTrue();

        for (PartTimeJob job : activeJobs) {
            // 1. 오늘 근무 요일인지 확인
            if (!isWorkingDay(job.getDay(), today)) {
                continue;
            }

            // 2. 사용자의 FCM 토큰 조회
            User user = userRepository.findById(job.getUserId()).orElse(null);
            if (user == null || user.getFcmToken() == null) {
                continue;
            }

            String businessName = "알바"; // 필요 시 Business 테이블 JOIN

            // 3. 출근 알림 (출근 시각 == 현재 시각)
            if (job.getStartTime() != null && job.getStartTime().equals(now)) {
                log.info("[스케줄러] 출근 알림 전송. userId={}, partTimeJobId={}", job.getUserId(), job.getId());
                fcmService.sendClockInReminder(user.getFcmToken(), businessName);
            }

            // 4. 퇴근 알림 (퇴근 시각 == 현재 시각)
            if (job.getEndTime() != null && job.getEndTime().equals(now)) {
                log.info("[스케줄러] 퇴근 알림 전송. userId={}, partTimeJobId={}", job.getUserId(), job.getId());
                fcmService.sendClockOutReminder(user.getFcmToken(), businessName);
            }
        }
    }

    /**
     * "MON,WED,FRI" 형식의 day 문자열을 파싱하여 오늘이 근무일인지 확인
     *
     * @param dayString  Part_Time_Job.day 컬럼 값 (예: "MON,TUE,WED")
     * @param today      오늘 요일 (DayOfWeek)
     */
    private boolean isWorkingDay(String dayString, DayOfWeek today) {
        if (dayString == null || dayString.isBlank()) return false;
        try {
            Set<DayOfWeek> workingDays = Arrays.stream(dayString.split(","))
                    .map(String::trim)
                    .map(DayOfWeek::valueOf)
                    .collect(Collectors.toSet());
            return workingDays.contains(today);
        } catch (IllegalArgumentException e) {
            log.warn("[스케줄러] 요일 파싱 실패. dayString={}", dayString);
            return false;
        }
    }
}