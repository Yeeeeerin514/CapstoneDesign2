package com.albasave.albasave_server.workinglog.repository;

import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartTimeJobRepository extends JpaRepository<PartTimeJob, Long> {

    /** 특정 사용자의 활성 알바 목록 */
    List<PartTimeJob> findByUserIdAndIsActiveTrue(Long userId);

    /** 특정 사용자의 전체 알바 목록 */
    List<PartTimeJob> findByUserId(Long userId);

    /** 스케줄러: 전체 활성 알바 목록 (알림 발송 대상 조회) */
    List<PartTimeJob> findAllByIsActiveTrue();
}
