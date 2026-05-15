package com.albasave.albasave_server.workinglog.repository;

import com.albasave.albasave_server.workinglog.domain.Working;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkingRepository extends JpaRepository<Working, Long>{

    /**
     * 특정 알바에서 현재 출근 중인 레코드 조회 (퇴근 미완료 = real_end_time IS NULL)
     * 출근 중복 방지 및 퇴근 처리 시 사용
     */
    Optional<Working> findByPartTimeJobIdAndRealEndTimeIsNull(Long partTimeJobId);

    /**
     * 특정 알바의 전체 출퇴근 이력 조회
     * 진정서 작성용 근무 시간 합산에 사용
     */
    List<Working> findByPartTimeJobIdOrderByRealStartTimeDesc(Long partTimeJobId);
}
