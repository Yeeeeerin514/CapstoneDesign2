package com.albasave.albasave_server.mentoring.service;

import com.albasave.albasave_server.mentoring.domain.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Gower 거리 기반 멘토-멘티 유사도 계산.
 *
 * <h3>혼합형 데이터에 적합한 이유</h3>
 * 단순 코사인은 카테고리·서수·다중선택 혼합 데이터에 부적합.
 * Gower distance는 각 항목별로 적절한 거리 함수를 따로 정의해서 합산:
 *
 * <ul>
 *   <li>damageTypes (다중선택) → 1 - Jaccard 유사도</li>
 *   <li>industry / employmentType (단일 카테고리) → 같으면 0, 다르면 1</li>
 *   <li>businessSize (서수 + 법 적용 차이) → 같으면 0, 5인 미만/이상 차이는 1, 그 외 0.5</li>
 *   <li>damageAmountRange (서수) → |ordinal 차이| / max_ordinal</li>
 *   <li>region (지역) → 같음 0, 인접 0.5, 그 외 1</li>
 *   <li>resolutionMethods (멘토만 보유) → 멘티 피해유형 대비 매칭률 (해결 경험 보유)</li>
 * </ul>
 *
 * <h3>결과</h3>
 * 항목별 정규화 거리(0~1) × 가중치 → 합산 → 정규화 → 최종 거리(0~1).
 * 함께 항목별 기여도(SHAP-style)도 반환 → 프론트에서 추천 이유 시각화.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GowerDistanceService {

    public static final List<String> FEATURE_NAMES = List.of(
            "damageTypes",
            "industry",
            "businessSize",
            "employmentType",
            "damageAmountRange",
            "region",
            "resolutionMethods"
    );

    /**
     * 가중치 기본값 — Thompson Sampling 데이터가 없을 때 도메인 지식 기반.
     * businessSize에 가장 큰 가중치(법 적용 차이가 매우 큼).
     */
    public static final Map<String, Double> DEFAULT_WEIGHTS = Map.of(
            "damageTypes", 1.5,
            "industry", 1.0,
            "businessSize", 2.0,
            "employmentType", 0.8,
            "damageAmountRange", 0.6,
            "region", 0.7,
            "resolutionMethods", 1.2
    );

    /**
     * 거리 계산 결과 — 최종 거리 + 항목별 기여도 (SHAP-style).
     */
    public record DistanceResult(
            double totalDistance,
            double matchScore,
            Map<String, Double> rawDistances,
            Map<String, Double> contributions  // 각 항목이 매칭에 기여한 비율 (0~1)
    ) {}

    /**
     * 멘토 vs 멘티 요청 사이 거리 계산.
     *
     * @param weights  Thompson Sampling으로 샘플링된 항목별 가중치. null이면 DEFAULT_WEIGHTS 사용.
     */
    public DistanceResult distance(
            MentorProfile mentor,
            MenteeMatchRequest request,
            Map<String, Double> weights
    ) {
        Map<String, Double> w = weights != null ? weights : DEFAULT_WEIGHTS;
        Map<String, Double> rawDist = new LinkedHashMap<>();

        rawDist.put("damageTypes",
                1.0 - jaccard(mentor.getDamageTypes(), request.getDamageTypes()));

        rawDist.put("industry",
                mentor.getIndustry() == request.getIndustry() ? 0.0 : 1.0);

        rawDist.put("businessSize",
                businessSizeDistance(mentor.getBusinessSize(), request.getBusinessSize()));

        rawDist.put("employmentType",
                Objects.equals(mentor.getEmploymentType(), request.getEmploymentType()) ? 0.0 : 1.0);

        rawDist.put("damageAmountRange",
                ordinalDistance(
                        mentor.getDamageAmountRange(),
                        request.getDamageAmountRange()));

        rawDist.put("region", regionDistance(mentor.getRegion(), request.getRegion()));

        rawDist.put("resolutionMethods",
                resolutionMethodMatchDistance(mentor.getResolutionMethods(), request.getDamageTypes()));

        // 가중 합계
        double weightedSum = 0.0;
        double weightSumTotal = 0.0;
        for (String f : FEATURE_NAMES) {
            double weight = w.getOrDefault(f, 1.0);
            weightedSum += weight * rawDist.get(f);
            weightSumTotal += weight;
        }
        double totalDistance = weightSumTotal > 0 ? weightedSum / weightSumTotal : 1.0;
        double matchScore = 1.0 - totalDistance;

        // 기여도 = (1 - rawDist) × weight / weightSumTotal
        // → 합치면 matchScore가 됨
        Map<String, Double> contributions = new LinkedHashMap<>();
        for (String f : FEATURE_NAMES) {
            double weight = w.getOrDefault(f, 1.0);
            double contribution = (1.0 - rawDist.get(f)) * weight / weightSumTotal;
            contributions.put(f, contribution);
        }

        return new DistanceResult(totalDistance, matchScore, rawDist, contributions);
    }

    /**
     * 멘티 요청 간 유사도 (0~1) — 협업 필터링(CROWN cold-start)의 attention 가중치용.
     * 멘토-멘티 distance와 동일한 항목별 거리 함수를 멘티-멘티에 적용(멘토 전용 resolutionMethods 제외).
     */
    public double requestSimilarity(MenteeMatchRequest a, MenteeMatchRequest b) {
        Map<String, Double> w = DEFAULT_WEIGHTS;
        double dIndustry = a.getIndustry() == b.getIndustry() ? 0.0 : 1.0;
        double dDamage = 1.0 - jaccard(a.getDamageTypes(), b.getDamageTypes());
        double dBiz = businessSizeDistance(a.getBusinessSize(), b.getBusinessSize());
        double dEmp = Objects.equals(a.getEmploymentType(), b.getEmploymentType()) ? 0.0 : 1.0;
        double dAmount = ordinalDistance(a.getDamageAmountRange(), b.getDamageAmountRange());
        double dRegion = regionDistance(a.getRegion(), b.getRegion());

        double wInd = w.get("industry"), wDmg = w.get("damageTypes"), wBiz = w.get("businessSize"),
                wEmp = w.get("employmentType"), wAmt = w.get("damageAmountRange"), wReg = w.get("region");
        double wsum = wInd + wDmg + wBiz + wEmp + wAmt + wReg;
        double dist = (wInd * dIndustry + wDmg * dDamage + wBiz * dBiz
                + wEmp * dEmp + wAmt * dAmount + wReg * dRegion) / wsum;
        return Math.max(0.0, Math.min(1.0, 1.0 - dist));
    }

    // ─────────────────────────────────────────────────────────────────
    //  항목별 거리 함수
    // ─────────────────────────────────────────────────────────────────

    /** Jaccard 유사도. 두 집합의 교집합 / 합집합. 둘 다 비면 1.0(완전 일치로 간주). */
    private double jaccard(List<DamageType> a, List<DamageType> b) {
        if (a == null) a = List.of();
        if (b == null) b = List.of();
        if (a.isEmpty() && b.isEmpty()) return 1.0;
        Set<DamageType> sa = new HashSet<>(a);
        Set<DamageType> sb = new HashSet<>(b);
        Set<DamageType> intersection = new HashSet<>(sa);
        intersection.retainAll(sb);
        Set<DamageType> union = new HashSet<>(sa);
        union.addAll(sb);
        return (double) intersection.size() / union.size();
    }

    /**
     * 사업장 규모 거리.
     * 5인 미만 ↔ 5인 이상은 법 적용 차이가 매우 크므로 가장 큰 거리(1.0).
     */
    private double businessSizeDistance(BusinessSize a, BusinessSize b) {
        if (a == null || b == null || a == BusinessSize.UNKNOWN || b == BusinessSize.UNKNOWN) return 0.7;
        if (a == b) return 0.0;
        // 5인 미만 vs 그 외 = 1.0 (법 적용 명확히 다름)
        boolean aUnder5 = a == BusinessSize.UNDER_5;
        boolean bUnder5 = b == BusinessSize.UNDER_5;
        if (aUnder5 != bUnder5) return 1.0;
        // 5~30 vs 30+ = 0.5 (일부 조항만 다름)
        return 0.5;
    }

    /** 서수형 거리. */
    private double ordinalDistance(DamageAmountRange a, DamageAmountRange b) {
        if (a == null || b == null) return 0.5;
        int diff = Math.abs(a.ordinalIndex() - b.ordinalIndex());
        return (double) diff / DamageAmountRange.maxOrdinal();
    }

    /** 지역 거리: 같음 0, 인접 0.5, 그 외 1. */
    private double regionDistance(Region a, Region b) {
        if (a == null || b == null) return 0.7;
        if (a == b) return 0.0;
        if (a.isAdjacent(b)) return 0.5;
        return 1.0;
    }

    /**
     * 멘토가 가진 해결 방법이 멘티 피해 유형에 적합한지.
     * 멘티 피해 유형이 임금체불·주휴수당·연장수당 같은 단순 청구 유형이면
     * 멘토가 "노동청 진정" 경험 있을수록 매칭률 ↑.
     *
     * 단순화: 멘토에게 해결 경험(=resolutionMethods 비어있지 않음)이 있으면 가산점.
     */
    private double resolutionMethodMatchDistance(
            List<ResolutionMethod> mentorMethods,
            List<DamageType> menteeDamages
    ) {
        if (mentorMethods == null || mentorMethods.isEmpty()) return 0.8;
        // 멘토가 노동청 진정 경험 있으면 임금체불·주휴수당류 매칭에 강함
        boolean mentorLaborOffice = mentorMethods.contains(ResolutionMethod.LABOR_OFFICE_REPORT);
        boolean menteeWageIssue = menteeDamages != null && menteeDamages.stream().anyMatch(d ->
                d == DamageType.WAGE_ARREARS ||
                d == DamageType.WEEKLY_HOLIDAY ||
                d == DamageType.OVERTIME_PAY ||
                d == DamageType.SEVERANCE_PAY);
        if (mentorLaborOffice && menteeWageIssue) return 0.1;
        // 멘토에게 어떤 해결 경험이라도 있으면 약간의 매칭률
        return 0.4;
    }
}
