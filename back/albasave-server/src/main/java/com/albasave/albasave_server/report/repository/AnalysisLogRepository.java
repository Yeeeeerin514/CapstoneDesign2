package com.albasave.albasave_server.report.repository;

import com.albasave.albasave_server.report.domain.AnalysisLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AnalysisLogRepository extends JpaRepository<AnalysisLog, Long> {

    List<AnalysisLog> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** 소멸시효(3년) 이내, 동일 사업자등록번호, 다른 사용자의 피해 사례 조회 (공동대응용) */
    @Query("""
            SELECT a FROM AnalysisLog a
            WHERE a.businessRegistrationNumber = :regNo
              AND a.userId <> :userId
              AND a.createdAt >= :since
              AND a.status <> 'WITHDRAWN'
            """)
    List<AnalysisLog> findOtherVictimsAtSameBusiness(
            @Param("regNo") String registrationNumber,
            @Param("userId") Long userId,
            @Param("since") LocalDateTime since);

    List<AnalysisLog> findByUserIdAndPartTimeJobId(Long userId, Long partTimeJobId);
}
