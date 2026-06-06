package com.albasave.albasave_server.mentoring.repository;

import com.albasave.albasave_server.mentoring.domain.MatchStatus;
import com.albasave.albasave_server.mentoring.domain.MentorshipMatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MentorshipMatchRepository extends JpaRepository<MentorshipMatch, Long> {
    List<MentorshipMatch> findByMenteeUserIdAndStatusOrderByCreatedAtDesc(Long menteeUserId, MatchStatus status);
    List<MentorshipMatch> findByMenteeUserIdOrderByCreatedAtDesc(Long menteeUserId);
    List<MentorshipMatch> findByMentorProfileIdAndStatus(Long mentorProfileId, MatchStatus status);
    long countByMentorProfileIdAndStatus(Long mentorProfileId, MatchStatus status);

    /** 멘토 인박스 — 내 멘토 프로필로 받은 모든 매칭 (최신순). */
    List<MentorshipMatch> findByMentorProfileIdOrderByCreatedAtDesc(Long mentorProfileId);
}
