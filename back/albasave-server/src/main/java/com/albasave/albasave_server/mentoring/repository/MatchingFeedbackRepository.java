package com.albasave.albasave_server.mentoring.repository;

import com.albasave.albasave_server.mentoring.domain.MatchingFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MatchingFeedbackRepository extends JpaRepository<MatchingFeedback, Long> {
    Optional<MatchingFeedback> findByMatchId(Long matchId);
    List<MatchingFeedback> findAllByMatchIdIn(List<Long> matchIds);
}
