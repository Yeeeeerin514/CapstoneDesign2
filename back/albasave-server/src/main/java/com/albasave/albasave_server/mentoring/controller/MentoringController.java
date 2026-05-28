package com.albasave.albasave_server.mentoring.controller;

import com.albasave.albasave_server.mentoring.domain.MentorProfile;
import com.albasave.albasave_server.mentoring.domain.MentorshipMatch;
import com.albasave.albasave_server.mentoring.dto.*;
import com.albasave.albasave_server.mentoring.service.MentoringService;
import com.albasave.albasave_server.mentoring.service.ThompsonSamplingWeightStore;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 멘토-멘티 매칭 REST API.
 *
 * <pre>
 *   POST   /api/mentoring/mentor-profile       멘토 등록/수정
 *   GET    /api/mentoring/mentor-profile/me    내 멘토 프로필 조회
 *   POST   /api/mentoring/match-request        매칭 요청 → top-K 멘토 추천
 *   POST   /api/mentoring/match/{id}/confirm   매칭 확정 (결제 완료 후)
 *   POST   /api/mentoring/feedback             피드백 제출 → Thompson Sampling 학습
 *   GET    /api/mentoring/my-matches           내 매칭 이력
 *   GET    /api/mentoring/weights              현재 가중치 분포 (모니터링/발표용)
 * </pre>
 */
@RestController
@RequestMapping("/api/mentoring")
@RequiredArgsConstructor
public class MentoringController {

    private final MentoringService mentoringService;
    private final ThompsonSamplingWeightStore weightStore;

    @PostMapping("/mentor-profile")
    public ResponseEntity<MentorProfile> registerMentor(
            @AuthenticationPrincipal Long userId,
            @RequestBody MentorRegistrationRequest req) {
        return ResponseEntity.ok(mentoringService.registerOrUpdateMentor(userId, null, req));
    }

    @GetMapping("/mentor-profile/me")
    public ResponseEntity<MentorProfile> getMyMentorProfile(@AuthenticationPrincipal Long userId) {
        return mentoringService.findMyProfile(userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/match-request")
    public ResponseEntity<MatchResponseEnvelope> requestMatch(
            @AuthenticationPrincipal Long userId,
            @RequestBody MatchRequestPayload payload) {
        return ResponseEntity.ok(mentoringService.requestMatch(userId, payload));
    }

    @PostMapping("/match/{matchId}/confirm")
    public ResponseEntity<MentorshipMatch> confirmMatch(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long matchId) {
        return ResponseEntity.ok(mentoringService.confirmMatch(userId, matchId));
    }

    @PostMapping("/feedback")
    public ResponseEntity<?> submitFeedback(
            @AuthenticationPrincipal Long userId,
            @RequestBody FeedbackRequest req) {
        return ResponseEntity.ok(mentoringService.submitFeedback(userId, req));
    }

    @GetMapping("/my-matches")
    public ResponseEntity<List<MentorshipMatch>> myMatches(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(mentoringService.findMyMatches(userId));
    }

    /** 캡스톤 발표용 — 현재 가중치 분포 모니터링. */
    @GetMapping("/weights")
    public ResponseEntity<Map<String, Object>> weights() {
        return ResponseEntity.ok(Map.of(
                "snapshot", weightStore.snapshot(),
                "expectedWeights", weightStore.expectedWeights(),
                "sampledOnce", weightStore.sampleWeights()
        ));
    }
}
