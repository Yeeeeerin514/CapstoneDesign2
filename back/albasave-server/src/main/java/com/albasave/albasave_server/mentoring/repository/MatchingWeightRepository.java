package com.albasave.albasave_server.mentoring.repository;

import com.albasave.albasave_server.mentoring.domain.MatchingWeight;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MatchingWeightRepository extends JpaRepository<MatchingWeight, Long> {
    Optional<MatchingWeight> findByFeatureName(String featureName);
    List<MatchingWeight> findAll();
}
