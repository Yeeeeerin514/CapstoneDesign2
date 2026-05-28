package com.albasave.albasave_server.mentoring.service;

import com.albasave.albasave_server.mentoring.domain.*;
import com.albasave.albasave_server.mentoring.dto.*;
import com.albasave.albasave_server.mentoring.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 멘토-멘티 매칭 비즈니스 로직 오케스트레이션.
 *
 * 1) 멘토 등록/수정
 * 2) 매칭 요청 처리 (Gower + Gale-Shapley + Thompson Sampling 통합)
 * 3) 피드백 수집 + Thompson Sampling 가중치 학습
 * 4) 내 매칭 조회
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MentoringService {

    private final MentorProfileRepository mentorRepository;
    private final MenteeMatchRequestRepository requestRepository;
    private final MentorshipMatchRepository matchRepository;
    private final MatchingFeedbackRepository feedbackRepository;
    private final GowerDistanceService gowerService;
    private final GaleShapleyMatcher matcher;
    private final ThompsonSamplingWeightStore weightStore;
    private final TwoTowerInferenceService twoTower;
    private final ObjectMapper objectMapper;

    /** 앙상블 가중치: finalScore = α·gower + (1-α)·neural. 신경망 미적재 시 α=1로 자동 폴백. */
    private static final double ENSEMBLE_GOWER_WEIGHT = 0.5;

    // ─────────────────────────────────────────────────────────────────
    //  멘토 등록
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public MentorProfile registerOrUpdateMentor(Long userId, String defaultNickname, MentorRegistrationRequest req) {
        // ── 자격 검증 ──────────────────────────────────────────────────
        // 모든 사용자가 멘토가 될 수 없음. 다음 중 하나 필수:
        //   1) RESOLVED_CASE: verifiedCaseIds 1개 이상 (앱 내 해결 경험)
        //   2) EVIDENCE_UPLOAD: evidenceUrls 1개 이상 (외부 증빙 자료)
        //   3) 기존 등록자라 verification 이미 갖춘 경우는 부분 수정 허용
        MentorProfile existing = mentorRepository.findByUserId(userId).orElse(null);
        boolean alreadyVerified = existing != null && existing.getVerificationMethod() != null;

        VerificationMethod method = req.getVerificationMethod();
        if (!alreadyVerified) {
            if (method == null) {
                throw new IllegalArgumentException(
                        "멘토 등록 자격이 없습니다. 앱 내 해결한 신고 사건 또는 증빙 자료가 필요합니다.");
            }
            if (method == VerificationMethod.RESOLVED_CASE
                    && (req.getVerifiedCaseIds() == null || req.getVerifiedCaseIds().isEmpty())) {
                throw new IllegalArgumentException(
                        "RESOLVED_CASE 검증에는 해결된 사건 ID가 1개 이상 필요합니다.");
            }
            if (method == VerificationMethod.EVIDENCE_UPLOAD
                    && (req.getEvidenceUrls() == null || req.getEvidenceUrls().isEmpty())) {
                throw new IllegalArgumentException(
                        "EVIDENCE_UPLOAD 검증에는 증빙 자료 URL이 1개 이상 필요합니다.");
            }
        }

        MentorProfile profile = existing != null ? existing : new MentorProfile();

        profile.setUserId(userId);
        profile.setNickname(req.getNickname() == null || req.getNickname().isBlank()
                ? (defaultNickname != null ? defaultNickname : "익명멘토")
                : req.getNickname());
        profile.setIndustry(req.getIndustry());
        profile.setDamageTypes(req.getDamageTypes() == null ? new ArrayList<>() : req.getDamageTypes());
        profile.setEmploymentType(req.getEmploymentType());
        profile.setBusinessSize(req.getBusinessSize() == null ? BusinessSize.UNKNOWN : req.getBusinessSize());
        profile.setRegion(req.getRegion());
        profile.setResolutionMethods(req.getResolutionMethods() == null ? new ArrayList<>() : req.getResolutionMethods());
        profile.setResolutionDuration(ResolutionDurationRange.fromDays(req.getResolutionDays()));
        profile.setDamageAmountRange(req.getDamageAmountRange());
        profile.setBio(req.getBio());
        if (req.getCapacity() != null) profile.setCapacity(Math.max(1, Math.min(req.getCapacity(), 10)));
        if (req.getConsultingFee() != null) profile.setConsultingFee(Math.max(0, req.getConsultingFee()));

        // 검증 정보 영속 (신규 검증 또는 추가 케이스 첨부)
        if (method != null) {
            profile.setVerificationMethod(method);
            profile.setVerifiedAt(LocalDateTime.now());
            try {
                if (req.getVerifiedCaseIds() != null && !req.getVerifiedCaseIds().isEmpty()) {
                    profile.setVerifiedCaseIdsJson(objectMapper.writeValueAsString(req.getVerifiedCaseIds()));
                }
                if (req.getEvidenceUrls() != null && !req.getEvidenceUrls().isEmpty()) {
                    profile.setEvidenceUrlsJson(objectMapper.writeValueAsString(req.getEvidenceUrls()));
                }
            } catch (Exception e) {
                log.warn("[Mentor] 자격 증빙 JSON 직렬화 실패: {}", e.getMessage());
            }
            profile.setVerified(true); // 검증 통과한 멘토는 isVerified true
        }

        profile.setUpdatedAt(LocalDateTime.now());
        if (existing == null) profile.setCreatedAt(LocalDateTime.now());

        return mentorRepository.save(profile);
    }

    @Transactional(readOnly = true)
    public Optional<MentorProfile> findMyProfile(Long userId) {
        return mentorRepository.findByUserId(userId);
    }

    // ─────────────────────────────────────────────────────────────────
    //  매칭 요청
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public MatchResponseEnvelope requestMatch(Long userId, MatchRequestPayload payload) {
        // 1) 요청 저장
        MenteeMatchRequest request = MenteeMatchRequest.builder()
                .menteeUserId(userId)
                .caseId(payload.getCaseId())
                .industry(payload.getIndustry())
                .damageTypes(payload.getDamageTypes() == null ? new ArrayList<>() : payload.getDamageTypes())
                .employmentType(payload.getEmploymentType())
                .businessSize(payload.getBusinessSize() == null ? BusinessSize.UNKNOWN : payload.getBusinessSize())
                .region(payload.getRegion())
                .damageAmountRange(payload.getDamageAmountRange())
                .description(payload.getDescription())
                .createdAt(LocalDateTime.now())
                .build();
        request = requestRepository.save(request);

        // 2) Thompson Sampling으로 이번 매칭의 가중치 샘플링
        Map<String, Double> weights = weightStore.sampleWeights();

        // 3) 검증된 멘토만 풀에 포함 (미검증/자격 없는 멘토는 매칭에서 제외)
        List<MentorProfile> allMentors = mentorRepository.findAll().stream()
                .filter(m -> m.getVerificationMethod() != null)
                .collect(Collectors.toList());
        log.info("[Matching] 검증된 멘토 풀 {}명, 멘티 요청 industry={}", allMentors.size(), payload.getIndustry());

        // 4) Gale-Shapley로 top-K 추천
        int topK = payload.getTopK() == null ? 3 : Math.max(1, Math.min(payload.getTopK(), 10));
        List<GaleShapleyMatcher.Candidate> candidates = matcher.recommend(allMentors, request, weights, topK);

        // 5) 앙상블 점수 계산 + MentorshipMatch를 PROPOSED 상태로 저장 + 응답 빌드
        // gowerScore: rule-based (5단계 알고리즘)
        // neuralScore: Two-tower 신경망 (가용 시)
        // finalScore: α·gower + (1-α)·neural
        boolean neuralOn = twoTower.isReady();
        double gowerW = neuralOn ? ENSEMBLE_GOWER_WEIGHT : 1.0;

        // 앙상블 점수로 candidates 재정렬
        record ScoredCandidate(GaleShapleyMatcher.Candidate cand, double gower, Double neural, double finalScore) {}
        List<ScoredCandidate> scored = new ArrayList<>();
        for (GaleShapleyMatcher.Candidate c : candidates) {
            double g = c.distance().matchScore();
            Double n = twoTower.score(c.mentor(), request);
            double finalScore = neuralOn && n != null
                    ? gowerW * g + (1 - gowerW) * n
                    : g;
            scored.add(new ScoredCandidate(c, g, n, finalScore));
        }
        scored.sort((a, b) -> Double.compare(b.finalScore(), a.finalScore()));

        List<MatchRecommendation> recs = new ArrayList<>();
        for (int i = 0; i < scored.size(); i++) {
            ScoredCandidate sc = scored.get(i);
            int rank = i + 1;
            String contributionsJson = serializeContributions(sc.cand().distance().contributions());

            MentorshipMatch match = MentorshipMatch.builder()
                    .requestId(request.getId())
                    .mentorProfileId(sc.cand().mentor().getId())
                    .menteeUserId(userId)
                    .caseId(payload.getCaseId())
                    .matchScore(sc.finalScore())
                    .ruleBasedScore(sc.gower())
                    .neuralScore(sc.neural())
                    .featureContributionsJson(contributionsJson)
                    .status(MatchStatus.PROPOSED)
                    .rankInRecommendation(rank)
                    .createdAt(LocalDateTime.now())
                    .build();
            match = matchRepository.save(match);

            recs.add(buildRecommendation(match.getId(), sc.cand(), rank, request,
                    sc.finalScore(), sc.gower(), sc.neural()));
        }

        String algorithm = neuralOn
                ? "Gower + Gale-Shapley + Thompson Sampling + Two-tower NN ensemble"
                : "Gower + Gale-Shapley + Thompson Sampling";

        return MatchResponseEnvelope.builder()
                .requestId(request.getId())
                .recommendations(recs)
                .weights(weights)
                .algorithm(algorithm)
                .build();
    }

    /** 추천 카드 빌드 — contributions를 자연어 reason으로 변환. */
    private MatchRecommendation buildRecommendation(
            Long matchId,
            GaleShapleyMatcher.Candidate cand,
            int rank,
            MenteeMatchRequest request,
            double finalScore,
            double ruleBasedScore,
            Double neuralScore
    ) {
        MentorProfile m = cand.mentor();
        Map<String, Double> contributions = cand.distance().contributions();
        List<String> reasons = buildReasons(m, request, cand.distance().rawDistances());

        return MatchRecommendation.builder()
                .matchId(matchId)
                .mentorProfileId(m.getId())
                .mentorUserId(m.getUserId())
                .mentorNickname(m.getNickname())
                .industry(m.getIndustry() != null ? m.getIndustry().label() : null)
                .damageTypes(m.getDamageTypes().stream().map(DamageType::label).collect(Collectors.toList()))
                .businessSize(m.getBusinessSize() != null ? m.getBusinessSize().label() : null)
                .region(m.getRegion() != null ? m.getRegion().label() : null)
                .resolutionMethods(m.getResolutionMethods().stream().map(ResolutionMethod::label).collect(Collectors.toList()))
                .isVerified(m.isVerified())
                .averageRating(m.getAverageRating())
                .reviewCount(m.getReviewCount())
                .consultingFee(m.getConsultingFee())
                .bio(m.getBio())
                .matchScore(finalScore)
                .ruleBasedScore(ruleBasedScore)
                .neuralScore(neuralScore)
                .contributions(contributions)
                .matchReasons(reasons)
                .rank(rank)
                .build();
    }

    /** 항목별 거리(0=일치)를 보고 사용자 친화적 이유 텍스트 생성. */
    private List<String> buildReasons(MentorProfile m, MenteeMatchRequest r, Map<String, Double> rawDist) {
        List<String> reasons = new ArrayList<>();

        if (rawDist.getOrDefault("industry", 1.0) == 0.0 && m.getIndustry() != null) {
            reasons.add("같은 업종(" + m.getIndustry().label() + ")");
        }
        if (rawDist.getOrDefault("businessSize", 1.0) == 0.0 && m.getBusinessSize() != null
                && m.getBusinessSize() != BusinessSize.UNKNOWN) {
            reasons.add("같은 사업장 규모(" + m.getBusinessSize().label() + ")");
        }
        double damageDist = rawDist.getOrDefault("damageTypes", 1.0);
        if (damageDist <= 0.5) {
            List<String> overlap = new ArrayList<>();
            if (m.getDamageTypes() != null && r.getDamageTypes() != null) {
                for (DamageType dt : r.getDamageTypes()) {
                    if (m.getDamageTypes().contains(dt)) overlap.add(dt.label());
                }
            }
            if (!overlap.isEmpty()) {
                reasons.add("같은 피해 경험(" + String.join(", ", overlap) + ")");
            }
        }
        if (rawDist.getOrDefault("region", 1.0) == 0.0 && m.getRegion() != null) {
            reasons.add("같은 지역(" + m.getRegion().label() + ")");
        } else if (rawDist.getOrDefault("region", 1.0) == 0.5 && m.getRegion() != null) {
            reasons.add("인접 지역(" + m.getRegion().label() + ")");
        }
        if (rawDist.getOrDefault("resolutionMethods", 1.0) <= 0.2) {
            String methodsStr = m.getResolutionMethods().stream()
                    .map(ResolutionMethod::label)
                    .collect(Collectors.joining(", "));
            if (!methodsStr.isBlank()) {
                reasons.add("해결 경험(" + methodsStr + ")");
            }
        }
        if (m.getResolutionDuration() != null
                && (m.getResolutionDuration() == ResolutionDurationRange.UNDER_1M
                || m.getResolutionDuration() == ResolutionDurationRange.MONTH_1_TO_3)) {
            reasons.add("빠른 해결 경험(" + m.getResolutionDuration().label() + ")");
        }

        if (reasons.isEmpty()) reasons.add("도메인 지식 가중치 기반 추천");
        return reasons;
    }

    private String serializeContributions(Map<String, Double> contributions) {
        try {
            return objectMapper.writeValueAsString(contributions);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, Double> deserializeContributions(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructMapType(LinkedHashMap.class, String.class, Double.class));
        } catch (Exception e) {
            return Map.of();
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  매칭 확정 (멘티가 결제·동의 후 호출)
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public MentorshipMatch confirmMatch(Long userId, Long matchId) {
        MentorshipMatch match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("매칭을 찾을 수 없습니다: " + matchId));
        if (!match.getMenteeUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 매칭만 확정할 수 있습니다.");
        }
        if (match.getStatus() != MatchStatus.PROPOSED) {
            return match; // 이미 ACTIVE이거나 다른 상태
        }
        match.setStatus(MatchStatus.ACTIVE);
        match.setMatchedAt(LocalDateTime.now());
        return matchRepository.save(match);
    }

    // ─────────────────────────────────────────────────────────────────
    //  피드백 + Thompson Sampling 학습
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public MatchingFeedback submitFeedback(Long userId, FeedbackRequest req) {
        MentorshipMatch match = matchRepository.findById(req.getMatchId())
                .orElseThrow(() -> new IllegalArgumentException("매칭을 찾을 수 없습니다: " + req.getMatchId()));
        if (!match.getMenteeUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 매칭에만 피드백을 줄 수 있습니다.");
        }

        MatchingFeedback existing = feedbackRepository.findByMatchId(req.getMatchId()).orElse(null);
        MatchingFeedback feedback = existing != null ? existing : new MatchingFeedback();
        feedback.setMatchId(req.getMatchId());
        feedback.setRating(Math.max(1, Math.min(req.getRating(), 5)));
        feedback.setChatDays(Math.max(0, req.getChatDays()));
        feedback.setResolved(req.isResolved());
        feedback.setComment(req.getComment());
        if (existing == null) feedback.setCreatedAt(LocalDateTime.now());

        MatchingFeedback saved = feedbackRepository.save(feedback);

        // Thompson Sampling 학습
        Map<String, Double> contributions = deserializeContributions(match.getFeatureContributionsJson());
        weightStore.updateFromFeedback(contributions, saved.isSuccess());

        // 해결되었으면 매칭 상태도 COMPLETED로
        if (saved.isResolved() && match.getStatus() == MatchStatus.ACTIVE) {
            match.setStatus(MatchStatus.COMPLETED);
            match.setCompletedAt(LocalDateTime.now());
            matchRepository.save(match);
        }

        return saved;
    }

    // ─────────────────────────────────────────────────────────────────
    //  내 매칭 조회
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MentorshipMatch> findMyMatches(Long userId) {
        return matchRepository.findByMenteeUserIdOrderByCreatedAtDesc(userId);
    }
}
