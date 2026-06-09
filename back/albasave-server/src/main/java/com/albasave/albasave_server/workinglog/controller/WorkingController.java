package com.albasave.albasave_server.workinglog.controller;

import com.albasave.albasave_server.userinfo.domain.User;
import com.albasave.albasave_server.userinfo.repository.UserRepository;
import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import com.albasave.albasave_server.workinglog.domain.PartTimeJobStatus;
import com.albasave.albasave_server.workinglog.dto.*;
import com.albasave.albasave_server.workinglog.repository.PartTimeJobRepository;
import com.albasave.albasave_server.workinglog.service.WorkingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 출퇴근 기록 API
 *
 * [API 목록]
 * POST   /api/working/register-workplace          - 관심업장 승격(FAVORITE→REGISTERED) 또는 직접 알바 등록
 * GET    /api/working/favorites                   - 관심업장(FAVORITE) 목록
 * GET    /api/working/workplaces                  - 근무업장(REGISTERED) 목록
 * DELETE /api/working/part-time-jobs/{id}         - 관심/근무업장 삭제
 * POST   /api/working/bssid/{partTimeJobId}       - 업장 BSSID 등록
 * POST   /api/working/clock-in                    - 출근
 * POST   /api/working/clock-out                   - 퇴근
 * GET    /api/working/current/{partTimeJobId}      - 현재 출근 중 여부 조회
 * GET    /api/working/history/{partTimeJobId}      - 출퇴근 이력 조회
 * GET    /api/working/total-minutes/{partTimeJobId}- 총 근무 시간(분) 조회
 */
@RestController
@RequestMapping("/api/working")
@RequiredArgsConstructor
public class WorkingController {

    private final WorkingService workingService;
    private final PartTimeJobRepository partTimeJobRepository;
    private final UserRepository userRepository;

    /**
     * 사업장 통합 등록 — BSSID 등록 화면 완료 시 호출.
     * PartTimeJob 자동 생성 + BSSID 영속 + 근무 정보(요일/시간/시급) 저장.
     * 응답으로 생성된 partTimeJobId 반환.
     *
     * Request body: {
     *   "workplaceName": "OO카페", "bssid": "aa:bb:cc:dd:ee:ff", "ssid": "OOcafe_wifi",
     *   "workDays": ["MONDAY","WEDNESDAY"], "workStartTime": "09:00",
     *   "workEndTime": "18:00", "startDay": "2026-06-08", "hourlyWage": 10030
     * }
     * 근무 정보 필드는 모두 선택 — 미전송 시 null/0 로 저장(기존 동작 호환).
     */
    @PostMapping("/register-workplace")
    public ResponseEntity<Map<String, Object>> registerWorkplace(
            @AuthenticationPrincipal Long userId,
            @RequestBody RegisterWorkplaceRequest body) {
        String bssid = body.getBssid();
        if (bssid == null || bssid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "BSSID is required"));
        }
        Integer daysMask = body.toDaysBitmask();

        // 1) partTimeJobId 가 오면 관심업장(FAVORITE) → 알바(REGISTERED) 승격.
        //    요청에 근무 정보가 함께 오면 덮어쓰고, 없으면 공고 분석으로 채워둔 기존 값을 유지한다.
        if (body.getPartTimeJobId() != null) {
            PartTimeJob job = partTimeJobRepository
                    .findByIdAndUser_Id(body.getPartTimeJobId(), userId)
                    .orElseThrow(() -> new IllegalArgumentException("관심업장을 찾을 수 없습니다."));
            if (body.getWorkplaceName() != null && !body.getWorkplaceName().isBlank()) {
                job.setBusinessName(body.getWorkplaceName());
            }
            if (daysMask != null) {
                job.setDays(daysMask);
            }
            if (body.toStartTime() != null) {
                job.setStartTime(body.toStartTime());
            }
            if (body.toEndTime() != null) {
                job.setEndTime(body.toEndTime());
            }
            if (body.toStartDay() != null) {
                job.setStartDay(body.toStartDay());
            }
            if (body.getHourlyWage() != null) {
                job.setHourlyWage(body.getHourlyWage());
            }
            job.promoteToRegistered(bssid);
            partTimeJobRepository.save(job);
            return ResponseEntity.ok(Map.of(
                    "partTimeJobId", job.getId(),
                    "bssid", bssid,
                    "workplaceName", job.getBusinessName() == null ? "사업장" : job.getBusinessName()
            ));
        }

        // 2) partTimeJobId 가 없으면(직접 등록/레거시) 새 REGISTERED 행 생성.
        String workplaceName = body.getWorkplaceName() == null || body.getWorkplaceName().isBlank()
                ? "사업장" : body.getWorkplaceName();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));
        PartTimeJob saved = partTimeJobRepository.save(PartTimeJob.builder()
                .user(user)
                .status(PartTimeJobStatus.REGISTERED)
                .businessName(workplaceName)
                .bssid(bssid)
                .days(daysMask != null ? daysMask : 0)
                .startTime(body.toStartTime())
                .endTime(body.toEndTime())
                .startDay(body.toStartDay())
                .hourlyWage(body.getHourlyWage())
                .isActive(true)
                .build());
        return ResponseEntity.ok(Map.of(
                "partTimeJobId", saved.getId(),
                "bssid", bssid,
                "workplaceName", workplaceName
        ));
    }

    /**
     * 관심업장(FAVORITE) 목록 조회 — 프론트 관심업장 탭.
     * 공고문 분석 시 자동 생성된 후보들을 반환한다.
     */
    @GetMapping("/favorites")
    public ResponseEntity<List<PartTimeJobSummary>> getFavorites(@AuthenticationPrincipal Long userId) {
        List<PartTimeJobSummary> result = partTimeJobRepository
                .findByUser_IdAndStatusOrderByIdDesc(userId, PartTimeJobStatus.FAVORITE)
                .stream().map(PartTimeJobSummary::from).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 등록된 근무업장(REGISTERED) 목록 조회 — 프론트 근무업장 탭.
     */
    @GetMapping("/workplaces")
    public ResponseEntity<List<PartTimeJobSummary>> getWorkplaces(@AuthenticationPrincipal Long userId) {
        List<PartTimeJobSummary> result = partTimeJobRepository
                .findRegisteredByUser(userId)
                .stream().map(PartTimeJobSummary::from).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 관심업장/근무업장 삭제 — 본인 소유만 삭제 가능.
     */
    @DeleteMapping("/part-time-jobs/{partTimeJobId}")
    public ResponseEntity<Void> deletePartTimeJob(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long partTimeJobId) {
        PartTimeJob job = partTimeJobRepository.findByIdAndUser_Id(partTimeJobId, userId)
                .orElseThrow(() -> new IllegalArgumentException("업장을 찾을 수 없습니다."));
        partTimeJobRepository.delete(job);
        return ResponseEntity.noContent().build();
    }

    /**
     * 업장 WiFi BSSID 등록
     * 출퇴근 기록 기능을 처음 활성화할 때 호출
     *
     * 사전 조건: 사용자가 업장 WiFi에 연결된 상태
     * 프론트 책임: 현재 연결된 WiFi BSSID를 읽어 request body에 담아 전송
     */
    @PostMapping("/bssid/{partTimeJobId}")
    public ResponseEntity<Void> registerBssid(
            @PathVariable Long partTimeJobId,
            @RequestBody BssidRegisterRequest request) {
        workingService.registerBssid(partTimeJobId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * 출근 처리
     *
     * 프론트 책임: 사용자가 출근하기 버튼 클릭 시 현재 WiFi BSSID를 읽어 전달
     * 백엔드 책임: BSSID 비교 → 일치 시 Working 레코드 생성
     *
     * 응답:
     *  200 OK   - 출근 성공 (WorkingResponse 반환)
     *  400      - 이미 출근 중 / BSSID 불일치 / 알바 없음
     */
    @PostMapping("/clock-in")
    public ResponseEntity<WorkingResponse> clockIn(@RequestBody ClockInRequest request) {
        WorkingResponse response = workingService.clockIn(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 퇴근 처리
     *
     * 프론트 책임: 퇴근 알림 수신 → "지금 퇴근" 선택 또는 "연장 후 퇴근" 시 BSSID 전달
     * 백엔드 책임: BSSID 비교 → 일치 시 real_end_time 기록
     *
     * 응답:
     *  200 OK   - 퇴근 성공 (WorkingResponse에 근무시간 포함)
     *  400      - BSSID 불일치 / 이미 퇴근 처리됨
     */
    @PostMapping("/clock-out")
    public ResponseEntity<WorkingResponse> clockOut(@RequestBody ClockOutRequest request) {
        WorkingResponse response = workingService.clockOut(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 현재 출근 중인 레코드 조회
     * 앱 화면 진입 시 퇴근 버튼 활성화 여부를 판단하기 위해 사용
     *
     * 응답:
     *  200 - 출근 중인 Working 레코드 (없으면 null)
     */
    @GetMapping("/current/{partTimeJobId}")
    public ResponseEntity<WorkingResponse> getCurrentWorking(@PathVariable Long partTimeJobId) {
        WorkingResponse response = workingService.getCurrentWorking(partTimeJobId);
        return ResponseEntity.ok(response);
    }

    /**
     * 출퇴근 이력 조회
     * 진정서 근거 자료 / 히스토리 화면에 사용
     */
    @GetMapping("/history/{partTimeJobId}")
    public ResponseEntity<List<WorkingResponse>> getHistory(@PathVariable Long partTimeJobId) {
        return ResponseEntity.ok(workingService.getWorkingHistory(partTimeJobId));
    }

    /**
     * 총 근무 시간(분) 조회
     * 미지급 임금 계산 화면에서 사용
     */
    @GetMapping("/total-minutes/{partTimeJobId}")
    public ResponseEntity<Map<String, Long>> getTotalMinutes(@PathVariable Long partTimeJobId) {
        long minutes = workingService.getTotalWorkingMinutes(partTimeJobId);
        return ResponseEntity.ok(Map.of("totalMinutes", minutes));
    }
}