package com.albasave.albasave_server.mentoring.controller;

import com.albasave.albasave_server.mentoring.domain.MentorProfile;
import com.albasave.albasave_server.mentoring.domain.VerificationMethod;
import com.albasave.albasave_server.mentoring.repository.MentorProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 관리자 — 멘토 자격 승인/거부.
 *
 * Phase 1: SecurityConfig의 /api/admin/** permitAll 활용.
 * 운영 단계에서는 별도 admin role 검증 추가 필요.
 *
 * <pre>
 *   GET   /api/admin/mentoring/pending          EVIDENCE_UPLOAD 대기 멘토 목록
 *   POST  /api/admin/mentoring/{id}/approve     ADMIN_VERIFIED로 승격
 *   POST  /api/admin/mentoring/{id}/reject      자격 박탈 (verificationMethod = null)
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/mentoring")
@RequiredArgsConstructor
public class MentoringAdminController {

    private final MentorProfileRepository mentorRepository;

    @GetMapping("/pending")
    public ResponseEntity<List<MentorProfile>> pending() {
        return ResponseEntity.ok(mentorRepository.findEvidencePending());
    }

    @PostMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<MentorProfile> approve(@PathVariable Long id) {
        MentorProfile m = mentorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("멘토를 찾을 수 없습니다: " + id));
        m.setVerificationMethod(VerificationMethod.ADMIN_VERIFIED);
        m.setVerified(true);
        m.setVerifiedAt(LocalDateTime.now());
        m.setUpdatedAt(LocalDateTime.now());
        log.info("[Admin] 멘토 {} ADMIN_VERIFIED 승격", id);
        return ResponseEntity.ok(mentorRepository.save(m));
    }

    @PostMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<Map<String, Object>> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        MentorProfile m = mentorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("멘토를 찾을 수 없습니다: " + id));
        String reason = body != null ? body.getOrDefault("reason", "사유 미기재") : "사유 미기재";
        m.setVerificationMethod(null);  // 자격 박탈 → 매칭 풀에서 제외
        m.setVerified(false);
        m.setVerifiedAt(null);
        m.setUpdatedAt(LocalDateTime.now());
        mentorRepository.save(m);
        log.info("[Admin] 멘토 {} 자격 거부 — reason={}", id, reason);
        return ResponseEntity.ok(Map.of("rejected", true, "reason", reason));
    }
}
