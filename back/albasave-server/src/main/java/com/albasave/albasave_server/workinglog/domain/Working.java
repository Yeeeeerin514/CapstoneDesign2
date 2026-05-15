package com.albasave.albasave_server.workinglog.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 한 번의 출근~퇴근을 기록하는 테이블
 * real_end_time == null → 현재 출근 중 (퇴근 미완료)
 */
@Entity
@Table(name = "working")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Working {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Part_Time_Job.id FK */
    @Column(name = "part_time_job_id", nullable = false)
    private Long partTimeJobId;

    /** 실제 출근 시각 */
    @Column(name = "real_start_time")
    private LocalDateTime realStartTime;

    /** 실제 퇴근 시각 (퇴근 전까지 null) */
    @Column(name = "real_end_time")
    private LocalDateTime realEndTime;

    @Builder
    public Working(Long partTimeJobId, LocalDateTime realStartTime) {
        this.partTimeJobId = partTimeJobId;
        this.realStartTime = realStartTime;
    }

    // 퇴근 시간 업데이트
    public void whenLeaveWork(LocalDateTime realEndTime) {
        this.realEndTime = realEndTime;
    }
}