package com.albasave.albasave_server.workinglog.service;

import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import com.albasave.albasave_server.userinfo.domain.User;
import com.albasave.albasave_server.userinfo.repository.UserRepository;
import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import com.albasave.albasave_server.workinglog.domain.PartTimeJobStatus;
import com.albasave.albasave_server.workinglog.repository.PartTimeJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 공고문 분석 결과를 유저의 "관심업장"(PartTimeJob status=FAVORITE)으로 자동 저장한다.
 *
 * 설계:
 *  - 공고문 분석 시점에 자동으로 FAVORITE 행을 생성한다(별도 "추가" 버튼 없음).
 *  - 중복 판단 기준은 업장명(businessName). 같은 유저가 동일 업장명으로 다시 분석하면
 *    새 행을 만들지 않고 최신 분석값으로 갱신한다.
 *  - FAVORITE 는 아직 알바가 아니므로 isActive=false 로 두어 출퇴근 알림 스케줄러 대상에서 제외한다.
 */
@Service
@RequiredArgsConstructor
public class FavoriteWorkplaceService {

    private static final Pattern TIME_PATTERN = Pattern.compile("(\\d{1,2})\\s*[:시]\\s*(\\d{2})?");

    private final PartTimeJobRepository partTimeJobRepository;
    private final UserRepository userRepository;

    /**
     * 분석 결과로 관심업장을 저장/갱신한다.
     *
     * @return 저장(또는 갱신)된 PartTimeJob id. 저장 조건을 못 채우면 Optional.empty().
     */
    @Transactional
    public Optional<Long> saveFromAnalysis(Long userId, Long analysisId, ExtractedJobPosting extracted) {
        if (userId == null || extracted == null) {
            return Optional.empty();
        }
        String businessName = extracted.businessName();
        // 빈 업장명 가드 — 더미 이름으로 관심업장이 합쳐지는 것을 방지
        if (businessName == null || businessName.isBlank()) {
            return Optional.empty();
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return Optional.empty();
        }

        Integer days = toDaysBitmask(extracted.workDays());
        LocalTime[] workTime = parseWorkTime(extracted.workTimeText());

        Optional<PartTimeJob> existing = partTimeJobRepository
                .findFirstByUser_IdAndBusinessNameAndStatus(userId, businessName, PartTimeJobStatus.FAVORITE);

        if (existing.isPresent()) {
            // 같은 업장명의 관심업장이 이미 있으면 최신 분석값으로 갱신
            PartTimeJob job = existing.get();
            job.setHourlyWage(extracted.hourlyWage());
            if (days != null) {
                job.setDays(days);
            }
            if (workTime[0] != null) {
                job.setStartTime(workTime[0]);
            }
            if (workTime[1] != null) {
                job.setEndTime(workTime[1]);
            }
            job.setJobPostingAnalysisId(analysisId);
            partTimeJobRepository.save(job);
            return Optional.of(job.getId());
        }

        PartTimeJob saved = partTimeJobRepository.save(PartTimeJob.builder()
                .user(user)
                .status(PartTimeJobStatus.FAVORITE)
                .businessName(businessName)
                .hourlyWage(extracted.hourlyWage())
                .days(days)
                .startTime(workTime[0])
                .endTime(workTime[1])
                .jobPostingAnalysisId(analysisId)
                .isActive(false) // FAVORITE 은 비활성 → 출퇴근 알림 스케줄러 대상에서 제외
                .build());
        return Optional.of(saved.getId());
    }

    /**
     * DayOfWeek 이름 목록 → PartTimeJob.days 비트마스크.
     * MON=1, TUE=2, WED=4, THU=8, FRI=16, SAT=32, SUN=64 (bit = DayOfWeek.getValue()-1).
     */
    private Integer toDaysBitmask(List<String> workDays) {
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

    /**
     * "09:00~18:00", "9시~18시" 같은 근무시간 원문에서 [시작, 종료] LocalTime 추출.
     * 파싱 실패한 자리는 null.
     */
    private LocalTime[] parseWorkTime(String workTimeText) {
        LocalTime[] result = new LocalTime[2];
        if (workTimeText == null || workTimeText.isBlank()) {
            return result;
        }
        Matcher matcher = TIME_PATTERN.matcher(workTimeText);
        int idx = 0;
        while (matcher.find() && idx < 2) {
            try {
                int hour = Integer.parseInt(matcher.group(1));
                int minute = matcher.group(2) != null ? Integer.parseInt(matcher.group(2)) : 0;
                if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                    result[idx++] = LocalTime.of(hour, minute);
                }
            } catch (NumberFormatException ignored) {
                // 무시
            }
        }
        return result;
    }
}
