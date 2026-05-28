package com.albasave.albasave_server.mentoring.repository;

import com.albasave.albasave_server.mentoring.domain.Industry;
import com.albasave.albasave_server.mentoring.domain.MentorProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MentorProfileRepository extends JpaRepository<MentorProfile, Long> {
    Optional<MentorProfile> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
    List<MentorProfile> findByIndustry(Industry industry);
}
