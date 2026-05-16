package com.albasave.albasave_server.contract.repository;

import com.albasave.albasave_server.contract.domain.LaborContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LaborContractRepository extends JpaRepository<LaborContract, Long> {
    List<LaborContract> findByUserIdOrderByCreatedAtDesc(Long userId);
}
