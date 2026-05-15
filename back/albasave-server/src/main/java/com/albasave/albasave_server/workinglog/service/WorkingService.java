package com.albasave.albasave_server.workinglog.service;

import com.albasave.albasave_server.workinglog.dto.*;
import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import com.albasave.albasave_server.workinglog.domain.Working;
import com.albasave.albasave_server.workinglog.exception.AlreadyClockedInException;
import com.albasave.albasave_server.workinglog.exception.BssidMismatchException;
import com.albasave.albasave_server.workinglog.repository.PartTimeJobRepository;
import com.albasave.albasave_server.workinglog.repository.WorkingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkingService {

    private final WorkingRepository workingRepository;
    private final PartTimeJobRepository partTimeJobRepository;

    // ─────────────────────────────────────────────────────────────────
    //  BSSID 등록
    //  출퇴근 기록 기능을 처음 활성화할 때 업장 WiFi BSSID를 저장
    // ─────────────────────────────────────────────────────────────────

    /**
     * 업장 WiFi BSSID 등록
     * [백엔드 책임] 프론트에서 받아온 BSSID를 part_time_job 테이블에 저장
     *
     * @param partTimeJobId 알바 ID
     * @param request       프론트가 WiFi에서 읽어온 BSSID
     */
    @Transactional
    public void registerBssid(Long partTimeJobId, BssidRegisterRequest request) {
        PartTimeJob job = findActiveJob(partTimeJobId);
        job.setBssid(request.getBssid());
        log.info("[BSSID 등록] partTimeJobId={}, bssid={}", partTimeJobId, request.getBssid());
    }

    // ─────────────────────────────────────────────────────────────────
    //  출근 처리
    // ─────────────────────────────────────────────────────────────────

    /**
     * 출근 기록
     *
     * 백엔드 책임:
     *  1. 해당 알바가 유효하고 활성 상태인지 확인
     *  2. 오늘 이미 출근한 기록이 있으면 중복 방지
     *  3. 프론트가 보내온 BSSID와 DB에 저장된 업장 BSSID 비교
     *  4. 일치하면 Working 레코드 생성 (real_start_time = 현재 시각)
     *
     * 프론트 책임:
     *  - 기기의 현재 WiFi BSSID를 읽어서 요청 바디에 담아 전송
     *  - 출근하기 버튼 UI 표시 / 숨김
     *
     * @param request partTimeJobId + 현재 연결된 WiFi BSSID
     * @return 생성된 Working 레코드
     */
    @Transactional
    public WorkingResponse clockIn(ClockInRequest request) {
        PartTimeJob job = findActiveJob(request.getPartTimeJobId());

        // 1. BSSID 검증
        validateBssid(job.getBssid(), request.getBssid());

        // 2. 중복 출근 방지 (이미 퇴근하지 않은 기록이 있으면 거부)
        workingRepository.findByPartTimeJobIdAndRealEndTimeIsNull(job.getId())
                .ifPresent(w -> { throw new AlreadyClockedInException(); });

        // 3. 출근 기록 저장
        Working working = Working.builder()
                .partTimeJobId(job.getId())
                .realStartTime(LocalDateTime.now())
                .build();
        Working saved = workingRepository.save(working);

        log.info("[출근 완료] partTimeJobId={}, workingId={}, time={}",
                job.getId(), saved.getId(), saved.getRealStartTime());

        return WorkingResponse.from(saved);
    }

    // ─────────────────────────────────────────────────────────────────
    //  퇴근 처리
    // ─────────────────────────────────────────────────────────────────

    /**
     * 퇴근 기록
     *
     * 백엔드 책임:
     *  1. workingId로 현재 출근 중인 레코드 조회
     *  2. BSSID 검증
     *  3. real_end_time 기록
     *
     * 프론트 책임:
     *  - 퇴근 알림 수신 후 "지금 퇴근" / "연장근무" 선택 UI 표시
     *  - "연장근무" 선택 시 퇴근하기 버튼 누를 때까지 대기
     *  - 퇴근하기 버튼 클릭 시 현재 BSSID를 읽어서 이 API 호출
     *
     * @param request workingId + 현재 WiFi BSSID
     * @return 업데이트된 Working 레코드 (근무 시간 포함)
     */
    @Transactional
    public WorkingResponse clockOut(ClockOutRequest request) {
        // 1. Working 레코드 조회
        Working working = workingRepository.findById(request.getWorkingId())
                .orElseThrow(() -> new IllegalArgumentException("해당 근무 기록을 찾을 수 없습니다."));

        if (working.getRealEndTime() != null) {
            throw new IllegalStateException("이미 퇴근 처리된 기록입니다.");
        }

        // 2. 업장 BSSID 조회 및 검증
        PartTimeJob job = findActiveJob(working.getPartTimeJobId());
        validateBssid(job.getBssid(), request.getBssid());

        // 3. 퇴근 시각 기록
        working.setRealEndTime(LocalDateTime.now());
        Working saved = workingRepository.save(working);

        long minutes = Duration.between(saved.getRealStartTime(), saved.getRealEndTime()).toMinutes();
        log.info("[퇴근 완료] partTimeJobId={}, workingId={}, 근무시간={}분",
                job.getId(), saved.getId(), minutes);

        return WorkingResponse.from(saved);
    }

    // ─────────────────────────────────────────────────────────────────
    //  조회
    // ─────────────────────────────────────────────────────────────────

    /**
     * 현재 출근 중인 레코드 조회 (퇴근 버튼 활성화 여부 판단용)
     */
    @Transactional(readOnly = true)
    public WorkingResponse getCurrentWorking(Long partTimeJobId) {
        return workingRepository.findByPartTimeJobIdAndRealEndTimeIsNull(partTimeJobId)
                .map(WorkingResponse::from)
                .orElse(null);
    }

    /**
     * 특정 알바의 전체 출퇴근 이력 조회
     * 진정서용 근무 시간 합산에 활용
     */
    @Transactional(readOnly = true)
    public List<WorkingResponse> getWorkingHistory(Long partTimeJobId) {
        return workingRepository.findByPartTimeJobIdOrderByRealStartTimeDesc(partTimeJobId)
                .stream()
                .map(WorkingResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 특정 알바의 총 근무 시간(분) 합산
     * 임금 계산 / 진정서 근거 자료 생성에 사용
     */
    @Transactional(readOnly = true)
    public long getTotalWorkingMinutes(Long partTimeJobId) {
        return workingRepository.findByPartTimeJobIdOrderByRealStartTimeDesc(partTimeJobId)
                .stream()
                .filter(w -> w.getRealStartTime() != null && w.getRealEndTime() != null)
                .mapToLong(w -> Duration.between(w.getRealStartTime(), w.getRealEndTime()).toMinutes())
                .sum();
    }

    // ─────────────────────────────────────────────────────────────────
    //  내부 헬퍼
    // ─────────────────────────────────────────────────────────────────

    private PartTimeJob findActiveJob(Long partTimeJobId) {
        PartTimeJob job = partTimeJobRepository.findById(partTimeJobId)
                .orElseThrow(() -> new IllegalArgumentException("알바 정보를 찾을 수 없습니다."));
        if (Boolean.FALSE.equals(job.getIsActive())) {
            throw new IllegalStateException("비활성화된 알바입니다.");
        }
        return job;
    }

    /**
     * BSSID 비교 검증
     * [백엔드 핵심 책임] 프론트가 전달한 BSSID와 DB에 저장된 업장 BSSID가 일치하는지 확인
     */
    private void validateBssid(String registeredBssid, String currentBssid) {
        if (registeredBssid == null || registeredBssid.isBlank()) {
            throw new IllegalStateException("등록된 업장 BSSID가 없습니다. 먼저 BSSID를 등록해주세요.");
        }
        if (!registeredBssid.equalsIgnoreCase(currentBssid)) {
            throw new BssidMismatchException();
        }
    }
}