package com.albasave.albasave_server.report.repository;

import com.albasave.albasave_server.report.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long>{
    List<Report> findAllByPartTimeJobId(Long partTimeJobId);

    /** 특정 사용자가 소유한 모든 신고 사건 (최신순). */
    List<Report> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
