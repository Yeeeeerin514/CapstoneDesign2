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

    /** EVIDENCE_UPLOAD로 신청했고 ADMIN_VERIFIED로 승격 안 된 멘토 (관리자 검토 대상) */
    @org.springframework.data.jpa.repository.Query(
            "SELECT m FROM MentorProfile m WHERE m.verificationMethod = "
                    + "com.albasave.albasave_server.mentoring.domain.VerificationMethod.EVIDENCE_UPLOAD "
                    + "ORDER BY m.verifiedAt DESC")
    List<MentorProfile> findEvidencePending();
}
