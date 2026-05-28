package com.albasave.albasave_server.mentoring.service;

import com.albasave.albasave_server.mentoring.domain.MenteeMatchRequest;
import com.albasave.albasave_server.mentoring.domain.MentorProfile;
import com.albasave.albasave_server.mentoring.repository.MentorshipMatchRepository;
import com.albasave.albasave_server.mentoring.domain.MatchStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Gale-Shapley 안정 매칭 알고리즘 (mentee-proposing, mentor capacity 제약).
 *
 * <h3>왜 단순 top-K 추천이 아니라 안정 매칭?</h3>
 * 단순 top-K = 멘티 입장만 최적화. 인기 멘토에게 매칭이 몰림.
 * Gale-Shapley = 멘토 캐파 제약 + 양방향 선호 → "안정 매칭" 보장.
 * 안정 매칭 = 어떤 멘토-멘티 쌍도 현재 매칭보다 서로를 더 좋아하지 않는 상태.
 *
 * <h3>알고리즘 (단일 멘티 + 활성 멘토들 캐파 고려)</h3>
 * Phase 1에서는 단일 멘티에 대해 top-K 멘토 추천이 목적이므로 다음과 같이 단순화:
 * 1. 모든 멘토 후보에 대해 Gower 거리 계산
 * 2. 거리 오름차순 정렬
 * 3. 각 멘토의 (capacity - currentMenteeCount) > 0 조건 통과한 멘토만 필터
 * 4. top-K 반환
 *
 * <h3>다중 멘티 동시 매칭 (확장)</h3>
 * 여러 멘티를 동시에 매칭할 때는 진짜 Gale-Shapley로 동작:
 * - 각 멘티 → 거리 작은 멘토 순서로 선호 리스트
 * - 멘토 → 자기 capacity만큼 받음, 넘으면 가장 가까운 멘티 우선
 * - 매칭 안정될 때까지 반복
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GaleShapleyMatcher {

    private final GowerDistanceService gowerService;
    private final MentorshipMatchRepository matchRepository;

    public record Candidate(
            MentorProfile mentor,
            GowerDistanceService.DistanceResult distance
    ) {}

    /**
     * 단일 멘티 요청에 대해 top-K 멘토 추천.
     * Gale-Shapley의 캐파 제약 + 거리 기반 정렬 + 멘토 현재 부하 반영.
     *
     * @param mentors  매칭 대상 멘토 풀 (DB에서 조회한 결과)
     * @param request  멘티 매칭 요청
     * @param weights  Thompson Sampling으로 샘플링된 가중치
     * @param topK     반환할 멘토 수
     */
    public List<Candidate> recommend(
            List<MentorProfile> mentors,
            MenteeMatchRequest request,
            Map<String, Double> weights,
            int topK
    ) {
        if (mentors == null || mentors.isEmpty()) return List.of();

        // 1. 모든 멘토와 거리 계산
        List<Candidate> candidates = mentors.stream()
                .map(m -> new Candidate(m, gowerService.distance(m, request, weights)))
                .collect(Collectors.toList());

        // 2. 자기 매칭 요청 제외 (멘토가 자기 자신을 멘토로 받지 않도록 — 동일 userId 차단)
        if (request.getMenteeUserId() != null) {
            candidates = candidates.stream()
                    .filter(c -> !Objects.equals(c.mentor().getUserId(), request.getMenteeUserId()))
                    .collect(Collectors.toList());
        }

        // 3. 거리 오름차순 정렬 (= 매칭 점수 내림차순)
        candidates.sort(Comparator.comparingDouble(c -> c.distance().totalDistance()));

        // 4. 캐파 제약 적용: 현재 ACTIVE 매칭 수가 capacity 미만인 멘토만 통과
        List<Candidate> withCapacity = candidates.stream()
                .filter(c -> hasCapacity(c.mentor()))
                .collect(Collectors.toList());

        // 5. top-K 반환
        return withCapacity.stream()
                .limit(topK)
                .collect(Collectors.toList());
    }

    /**
     * 멘토 캐파 여유 확인 — DB 현재 ACTIVE 매칭 수 vs capacity.
     * MentorProfile.currentMenteeCount는 캐시지만 DB 카운트가 정확함.
     */
    private boolean hasCapacity(MentorProfile mentor) {
        long activeCount = matchRepository.countByMentorProfileIdAndStatus(
                mentor.getId(), MatchStatus.ACTIVE);
        return activeCount < mentor.getCapacity();
    }

    /**
     * 다중 멘티 동시 매칭 (확장 사용처: 배치 매칭, 추천 시뮬레이션 등).
     * 진짜 Gale-Shapley로 동작.
     *
     * @return 멘티 ID → 매칭된 멘토 후보 (없으면 null)
     */
    public Map<Long, Candidate> stableMatching(
            List<MenteeMatchRequest> menteeRequests,
            List<MentorProfile> mentors,
            Map<String, Double> weights
    ) {
        // 각 멘티의 멘토 선호 리스트 (거리 오름차순)
        Map<Long, List<Candidate>> preferences = new HashMap<>();
        for (MenteeMatchRequest req : menteeRequests) {
            List<Candidate> sorted = mentors.stream()
                    .map(m -> new Candidate(m, gowerService.distance(m, req, weights)))
                    .sorted(Comparator.comparingDouble(c -> c.distance().totalDistance()))
                    .collect(Collectors.toList());
            preferences.put(req.getId(), sorted);
        }

        // 멘토별 현재 매칭된 멘티 리스트 (capacity 내에서)
        Map<Long, TreeMap<Double, Long>> mentorMenteeMap = new HashMap<>();
        for (MentorProfile m : mentors) mentorMenteeMap.put(m.getId(), new TreeMap<>());

        // 매칭 안 된 멘티 큐
        Deque<Long> unmatched = new ArrayDeque<>();
        for (MenteeMatchRequest req : menteeRequests) unmatched.offer(req.getId());

        // 각 멘티의 다음 제안할 멘토 인덱스
        Map<Long, Integer> nextProposalIndex = new HashMap<>();
        for (Long mid : unmatched) nextProposalIndex.put(mid, 0);

        while (!unmatched.isEmpty()) {
            Long menteeId = unmatched.poll();
            int idx = nextProposalIndex.get(menteeId);
            List<Candidate> prefs = preferences.get(menteeId);
            if (idx >= prefs.size()) continue; // 더 이상 제안할 멘토 없음

            Candidate proposed = prefs.get(idx);
            nextProposalIndex.put(menteeId, idx + 1);

            MentorProfile mentor = proposed.mentor();
            TreeMap<Double, Long> current = mentorMenteeMap.get(mentor.getId());
            int capacity = mentor.getCapacity();

            if (current.size() < capacity) {
                current.put(proposed.distance().totalDistance(), menteeId);
            } else {
                // 캐파 꽉 참 — 현재 매칭 중 가장 거리 먼 멘티와 비교
                Map.Entry<Double, Long> worst = current.lastEntry();
                if (proposed.distance().totalDistance() < worst.getKey()) {
                    current.remove(worst.getKey());
                    current.put(proposed.distance().totalDistance(), menteeId);
                    unmatched.offer(worst.getValue());
                } else {
                    unmatched.offer(menteeId);
                }
            }
        }

        // 결과 정리: 멘티 ID → 매칭된 멘토 후보
        Map<Long, Candidate> result = new HashMap<>();
        for (Map.Entry<Long, TreeMap<Double, Long>> e : mentorMenteeMap.entrySet()) {
            Long mentorId = e.getKey();
            for (Map.Entry<Double, Long> matched : e.getValue().entrySet()) {
                Long menteeId = matched.getValue();
                Candidate cand = preferences.get(menteeId).stream()
                        .filter(c -> c.mentor().getId().equals(mentorId))
                        .findFirst().orElse(null);
                if (cand != null) result.put(menteeId, cand);
            }
        }
        return result;
    }
}
