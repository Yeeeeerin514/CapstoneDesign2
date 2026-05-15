package com.albasave.albasave_server.workinglog.dto;

import com.albasave.albasave_server.workinglog.domain.Working;
import lombok.Builder;
import lombok.Getter;

import java.time.Duration;
import java.time.LocalDateTime;

// ─────────────────────────────────────────────
//  출퇴근 기록 응답 DTO
// ─────────────────────────────────────────────
@Getter
@Builder
public class WorkingResponse {

    private Long id;
    private Long partTimeJobId;
    private LocalDateTime realStartTime;
    private LocalDateTime realEndTime;

    /** 총 근무 시간(분). 퇴근 전이면 null */
    private Long workingMinutes;

    /** 현재 출근 중 여부 */
    private boolean inProgress;

    public static WorkingResponse from(Working w) {
        Long minutes = null;
        if (w.getRealStartTime() != null && w.getRealEndTime() != null) {
            minutes = Duration.between(w.getRealStartTime(), w.getRealEndTime()).toMinutes();
        }
        return WorkingResponse.builder()
                .id(w.getId())
                .partTimeJobId(w.getPartTimeJobId())
                .realStartTime(w.getRealStartTime())
                .realEndTime(w.getRealEndTime())
                .workingMinutes(minutes)
                .inProgress(w.getRealEndTime() == null)
                .build();
    }
}