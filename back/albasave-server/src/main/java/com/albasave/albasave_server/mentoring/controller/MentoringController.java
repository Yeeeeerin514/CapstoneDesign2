package com.albasave.albasave_server.mentoring.controller;

import com.albasave.albasave_server.jobposting.service.JobPostingImageStorageService;
import com.albasave.albasave_server.mentoring.domain.ChatMessage;
import com.albasave.albasave_server.mentoring.domain.MentorProfile;
import com.albasave.albasave_server.mentoring.domain.MentorshipMatch;
import com.albasave.albasave_server.mentoring.dto.*;
import com.albasave.albasave_server.mentoring.repository.ChatMessageRepository;
import com.albasave.albasave_server.mentoring.repository.MentorProfileRepository;
import com.albasave.albasave_server.mentoring.repository.MentorshipMatchRepository;
import com.albasave.albasave_server.mentoring.service.MentoringService;
import com.albasave.albasave_server.mentoring.service.ThompsonSamplingWeightStore;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
    private final JobPostingImageStorageService storage;
    private final ChatMessageRepository chatRepository;
    private final MentorshipMatchRepository matchRepository;
    private final MentorProfileRepository mentorProfileRepository;

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

    /**
     * 멘토 인박스 — 로그인한 사용자가 "멘토로서" 받은 매칭 목록.
     * (mentorProfile.userId == 로그인 유저). 멘티가 확정한 ACTIVE/COMPLETED 매칭만.
     * 멘토 프로필이 없으면 빈 배열. 양방향 실시간 채팅의 멘토 측 진입점.
     */
    @GetMapping("/my-mentor-matches")
    public ResponseEntity<List<MentorInboxMatch>> myMentorMatches(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(mentoringService.findMyMentorMatches(userId));
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

    /**
     * 멘토 자격 증빙 자료 업로드 — S3 mentor-evidence/ 폴더.
     * 응답: { url: "https://.../mentor-evidence/..." }
     * 클라이언트는 받은 URL을 mentor-profile 등록 시 evidenceUrls에 첨부.
     */
    @PostMapping("/evidence/upload")
    public ResponseEntity<Map<String, String>> uploadEvidence(
            @AuthenticationPrincipal Long userId,
            @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "파일이 비어있습니다."));
        }
        return storage.upload(file, "mentor-evidence")
                .map(url -> ResponseEntity.ok(Map.of("url", url)))
                .orElseGet(() -> ResponseEntity.status(500)
                        .body(Map.of("error", "S3 업로드 실패")));
    }

    // ─────────────────────────────────────────────────────────────────
    //  1:1 채팅 — REST 폴링 기반 (WebSocket 대체)
    //  멘토/멘티 양쪽 모두 메시지 전송·조회 가능. since 파라미터로 증분 가져옴.
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/match/{matchId}/messages")
    public ResponseEntity<List<ChatMessage>> fetchMessages(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long matchId,
            @RequestParam(value = "since", required = false) String sinceIso) {
        verifyParticipant(userId, matchId); // 멘티·멘토 본인만 조회 가능 (아니면 400 차단)
        if (sinceIso == null || sinceIso.isBlank()) {
            return ResponseEntity.ok(chatRepository.findByMatchIdOrderByCreatedAtAsc(matchId));
        }
        try {
            java.time.LocalDateTime since = java.time.LocalDateTime.parse(sinceIso);
            return ResponseEntity.ok(
                    chatRepository.findByMatchIdAndCreatedAtAfterOrderByCreatedAtAsc(matchId, since));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/match/{matchId}/messages")
    public ResponseEntity<ChatMessage> sendMessage(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long matchId,
            @RequestBody Map<String, String> body) {
        Participant p = verifyParticipant(userId, matchId);
        String text = body.getOrDefault("text", "").trim();
        if (text.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        ChatMessage msg = chatRepository.save(ChatMessage.builder()
                .matchId(matchId)
                .senderUserId(userId)
                .senderRole(p.role()) // 검증으로 확정된 역할 (MENTEE | MENTOR)
                .text(text)
                .createdAt(java.time.LocalDateTime.now())
                .build());
        return ResponseEntity.ok(msg);
    }

    /** 검증된 채팅 참여자 (매칭 + 확정된 역할). */
    private record Participant(MentorshipMatch match, String role) {}

    /**
     * 멘티/멘토 본인 검증. 로그인 유저가 이 매칭의 멘티이거나, 이 매칭의
     * 멘토 프로필 소유자인지 확인하고 역할을 확정한다. 둘 다 아니면 차단.
     *   - 멘티: userId == match.menteeUserId
     *   - 멘토: mentorProfileRepository.findByUserId(userId).id == match.mentorProfileId
     */
    private Participant verifyParticipant(Long userId, Long matchId) {
        MentorshipMatch match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("매칭을 찾을 수 없습니다: " + matchId));
        if (userId != null && userId.equals(match.getMenteeUserId())) {
            return new Participant(match, "MENTEE");
        }
        boolean isMentor = mentorProfileRepository.findByUserId(userId)
                .map(p -> p.getId().equals(match.getMentorProfileId()))
                .orElse(false);
        if (isMentor) {
            return new Participant(match, "MENTOR");
        }
        // 멘티도 멘토도 아닌 접근 — 차단. (GlobalExceptionHandler가 400 + 메시지로 매핑)
        throw new IllegalArgumentException("이 매칭의 참여자가 아닙니다.");
    }
}
