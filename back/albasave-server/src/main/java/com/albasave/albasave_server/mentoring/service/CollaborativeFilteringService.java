package com.albasave.albasave_server.mentoring.service;

import com.albasave.albasave_server.mentoring.domain.MatchingFeedback;
import com.albasave.albasave_server.mentoring.domain.MenteeMatchRequest;
import com.albasave.albasave_server.mentoring.domain.MentorshipMatch;
import com.albasave.albasave_server.mentoring.repository.MatchingFeedbackRepository;
import com.albasave.albasave_server.mentoring.repository.MenteeMatchRequestRepository;
import com.albasave.albasave_server.mentoring.repository.MentorshipMatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * 협업 필터링 — 콜드스타트 멘티를 위한 협업 신호.
 *
 * <h3>출처</h3>
 * "Advanced Topics in Data Science"(CAU)의 Topic #1 News Recommendation(CROWN)의
 * 핵심 아이디어: <b>"비슷한 관심사를 가진 사용자들의 신호(collaborative signals)는
 * 특히 콜드스타트 사용자의 표현을 강화하는 데 유용하다"</b>. CROWN은 user-item
 * bipartite graph에 GNN(GAT)을 올려 attention 가중 집계로 이를 구현한다.
 *
 * <h3>우리 시스템에 적용</h3>
 * 멘티는 사건마다 단발 요청만 하므로 사실상 항상 콜드스타트다(이력 없음).
 * 오프라인 GNN 학습 대신, 같은 효과를 <b>request-time 메모리 기반 + attention</b>으로 구현:
 * <ul>
 *   <li>멘티-멘토 양분 그래프의 엣지 = 피드백(평점·해결)이 달린 과거 매칭</li>
 *   <li>후보 멘토 m의 협업점수 = "m과 매칭됐던 과거 멘티들의 성과"를
 *       <b>현재 멘티와의 유사도(attention)</b>로 가중 평균</li>
 *   <li>유효표본이 적으면 베이지안 수축으로 신뢰도를 낮춤 → graceful</li>
 * </ul>
 * 피드백이 전혀 없으면 빈 맵을 반환 → 매칭 결과에 영향 0 (기존 동작과 동일).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborativeFilteringService {

    private final MatchingFeedbackRepository feedbackRepository;
    private final MentorshipMatchRepository matchRepository;
    private final MenteeMatchRequestRepository requestRepository;
    private final GowerDistanceService gowerService;

    /** 너무 다른 멘티의 피드백은 잡음 → 제외하는 유사도 하한. */
    private static final double SIMILARITY_THRESHOLD = 0.30;
    /** 베이지안 수축 상수 — 유사 피드백(유효표본)이 적으면 신뢰도를 낮춘다. */
    private static final double SHRINKAGE_K = 1.5;

    /** 멘토별 협업 결과. score=0~1 가중평균 성과, confidence=0~1 신뢰도, support=유효 피드백 수. */
    public record CollabResult(double score, double confidence, int support) {}

    private record Entry(MenteeMatchRequest request, double outcome) {}

    /**
     * 후보 멘토들에 대한 협업 점수 맵 (mentorProfileId → CollabResult).
     * 피드백이 없거나 유사 멘티가 없으면 해당 멘토는 맵에서 빠짐(= 협업신호 없음).
     */
    @Transactional(readOnly = true)
    public Map<Long, CollabResult> scoresForCandidates(MenteeMatchRequest query, List<Long> mentorProfileIds) {
        if (mentorProfileIds == null || mentorProfileIds.isEmpty()) return Map.of();

        List<MatchingFeedback> feedbacks = feedbackRepository.findAll();
        if (feedbacks.isEmpty()) return Map.of();

        // 피드백 → 매칭 → 멘티 요청 배치 로드 (N+1 회피)
        List<Long> matchIds = feedbacks.stream().map(MatchingFeedback::getMatchId).distinct().toList();
        Map<Long, MentorshipMatch> matchById = new HashMap<>();
        for (MentorshipMatch m : matchRepository.findAllById(matchIds)) matchById.put(m.getId(), m);

        List<Long> reqIds = matchById.values().stream()
                .map(MentorshipMatch::getRequestId).filter(Objects::nonNull).distinct().toList();
        Map<Long, MenteeMatchRequest> reqById = new HashMap<>();
        for (MenteeMatchRequest r : requestRepository.findAllById(reqIds)) reqById.put(r.getId(), r);

        // mentorProfileId → 과거 (멘티요청, 성과) 목록
        Map<Long, List<Entry>> byMentor = new HashMap<>();
        for (MatchingFeedback fb : feedbacks) {
            MentorshipMatch m = matchById.get(fb.getMatchId());
            if (m == null) continue;
            MenteeMatchRequest pastReq = reqById.get(m.getRequestId());
            if (pastReq == null) continue;
            // 같은 멘티 본인의 과거 요청은 제외 (자기 신호 누설 방지)
            if (query.getMenteeUserId() != null
                    && query.getMenteeUserId().equals(pastReq.getMenteeUserId())) continue;
            byMentor.computeIfAbsent(m.getMentorProfileId(), k -> new ArrayList<>())
                    .add(new Entry(pastReq, outcome(fb)));
        }

        Map<Long, CollabResult> out = new HashMap<>();
        for (Long mpid : mentorProfileIds) {
            List<Entry> entries = byMentor.get(mpid);
            if (entries == null || entries.isEmpty()) continue;

            double wsum = 0.0, wOutcome = 0.0;
            int support = 0;
            for (Entry e : entries) {
                double sim = gowerService.requestSimilarity(query, e.request()); // attention 가중치
                if (sim < SIMILARITY_THRESHOLD) continue;
                wsum += sim;
                wOutcome += sim * e.outcome();
                support++;
            }
            if (wsum <= 0.0) continue;

            double score = wOutcome / wsum;                  // attention 가중 평균 성과 (0~1)
            double confidence = wsum / (wsum + SHRINKAGE_K); // 유효표본 기반 신뢰도 (0~1)
            out.put(mpid, new CollabResult(score, confidence, support));
        }

        if (!out.isEmpty()) {
            log.info("[Collab] 협업신호 적용 멘토 {}명 (전체 피드백 {}건)", out.size(), feedbacks.size());
        }
        return out;
    }

    /** 피드백 성과값 (0~1) = 평점(가중 0.7) + 해결여부(가중 0.3). */
    private double outcome(MatchingFeedback fb) {
        double rating = Math.max(1, Math.min(fb.getRating(), 5)) / 5.0; // 0.2~1.0
        double resolved = fb.isResolved() ? 1.0 : 0.0;
        return Math.max(0.0, Math.min(1.0, 0.7 * rating + 0.3 * resolved));
    }
}
