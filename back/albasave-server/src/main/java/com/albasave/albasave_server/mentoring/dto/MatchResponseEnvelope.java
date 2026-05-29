package com.albasave.albasave_server.mentoring.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

/**
 * /api/mentoring/match-request 응답 envelope.
 *
 * <ul>
 *   <li>requestId: 저장된 매칭 요청 ID — 이후 결제·피드백에서 참조</li>
 *   <li>recommendations: top-K 멘토 카드</li>
 *   <li>weights: 이번 매칭에 사용된 Thompson Sampling 가중치 (모니터링용)</li>
 *   <li>algorithm: 사용한 알고리즘 라벨 (캡스톤 발표용)</li>
 * </ul>
 */
@Getter
@Builder
public class MatchResponseEnvelope {
    private final Long requestId;
    private final List<MatchRecommendation> recommendations;
    private final Map<String, Double> weights;
    private final String algorithm;
}
