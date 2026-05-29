package com.albasave.albasave_server.wagearrears.repository;

import com.albasave.albasave_server.wagearrears.domain.WageArrearsEmployer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WageArrearsEmployerRepository extends JpaRepository<WageArrearsEmployer, Long> {
    List<WageArrearsEmployer> findByNormalizedNameContaining(String normalizedName);

    boolean existsByNormalizedNameAndRepresentativeName(String normalizedName, String representativeName);
}
