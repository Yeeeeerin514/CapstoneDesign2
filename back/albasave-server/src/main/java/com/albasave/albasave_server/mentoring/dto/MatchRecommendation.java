package com.albasave.albasave_server.mentoring.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

/**
 * 매칭 추천 응답 1건 — 프론트가 그대로 받아서 카드로 렌더링.
 *
 * <ul>
 *   <li>matchScore: 0~1, 클수록 좋음. UI에선 0~100%로 표시</li>
 *   <li>contributions: 항목별 기여도 (SHAP-style). 합치면 matchScore.</li>
 *   <li>matchReasons: contributions의 사용자 친화적 텍스트 변환</li>
 * </ul>
 */
@Getter
@Builder
public class MatchRecommendation {
    private final Long matchId;             // PROPOSED 상태로 미리 저장된 ID
    private final Long mentorProfileId;
    private final Long mentorUserId;
    private final String mentorNickname;
    private final String industry;
    private final List<String> damageTypes;
    private final String businessSize;
    private final String region;
    private final List<String> resolutionMethods;
    private final boolean isVerified;
    private final double averageRating;
    private final int reviewCount;
    private final int consultingFee;
    private final String bio;

    /** 매칭 점수 (0~1) */
    private final double matchScore;
    /** 항목별 기여도 (matchScore 합산 가능) */
    private final Map<String, Double> contributions;
    /** 사용자 친화적 추천 이유 텍스트 (예: ["같은 업종(배달)", "같은 사업장 규모(5인 미만)"]) */
    private final List<String> matchReasons;
    private final int rank; // 1-based
}
