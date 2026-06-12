package com.albasave.albasave_server.contract.repository;

import com.albasave.albasave_server.contract.domain.LaborContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LaborContractRepository extends JpaRepository<LaborContract, Long> {
    List<LaborContract> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** 동일 사용자가 동일 이미지를 다시 업로드했는지 — 가장 최근 1건. */
    Optional<LaborContract> findFirstByUserIdAndImageHashOrderByCreatedAtDesc(Long userId, String imageHash);

    /** 특정 알바(관심업장)에 연결된 가장 최근 계약서 분석 — 프론트 캐시 유실 시 폴백 조회. */
    Optional<LaborContract> findFirstByUserIdAndPartTimeJobIdOrderByCreatedAtDesc(Long userId, Long partTimeJobId);
}
