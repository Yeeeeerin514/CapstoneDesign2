package com.albasave.albasave_server.mentoring.repository;

import com.albasave.albasave_server.mentoring.domain.MenteeMatchRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenteeMatchRequestRepository extends JpaRepository<MenteeMatchRequest, Long> {
    List<MenteeMatchRequest> findByMenteeUserIdOrderByCreatedAtDesc(Long menteeUserId);
}
