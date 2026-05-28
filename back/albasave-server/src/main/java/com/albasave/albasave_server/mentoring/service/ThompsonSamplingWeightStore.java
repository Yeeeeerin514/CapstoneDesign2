package com.albasave.albasave_server.mentoring.service;

import com.albasave.albasave_server.mentoring.domain.MatchingWeight;
import com.albasave.albasave_server.mentoring.repository.MatchingWeightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Thompson Sampling 기반 매칭 항목 가중치 학습.
 *
 * <h3>핵심 아이디어</h3>
 * 각 항목(damageTypes, industry, ...)의 "매칭 성공 기여도"를 Beta 분포로 모델링.
 * <ul>
 *   <li>매칭 시점: 각 항목의 Beta 분포에서 샘플링 → 가중치 결정 (exploration)</li>
 *   <li>피드백 시점: 매칭 성공 시 α++ / 실패 시 β++ (exploitation)</li>
 * </ul>
 *
 * <h3>콜드스타트 처리</h3>
 * 초기 Beta(1, 1) = 균등 분포 → 모든 항목 균등 기회.
 * 피드백 10건만 쌓여도 유의미한 가중치 학습 가능.
 *
 * <h3>피드백 → α/β 업데이트 규칙</h3>
 * 한 매칭이 success면 그 매칭에 기여한 항목들에 α += contribution.
 * 실패면 β += contribution.
 * (기여도가 큰 항목일수록 성공/실패 신호가 더 강하게 반영)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ThompsonSamplingWeightStore {

    private final MatchingWeightRepository repository;
    private final Random random = new Random();

    /** 앱 시작 시 가중치 미존재면 기본값(Beta(1,1))으로 초기화. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initIfEmpty() {
        for (String feature : GowerDistanceService.FEATURE_NAMES) {
            repository.findByFeatureName(feature).orElseGet(() ->
                    repository.save(MatchingWeight.builder()
                            .featureName(feature)
                            .alpha(1.0)
                            .beta(1.0)
                            .updatedAt(LocalDateTime.now())
                            .build())
            );
        }
        log.info("[ThompsonSampling] 가중치 {}개 초기화 완료", GowerDistanceService.FEATURE_NAMES.size());
    }

    /**
     * 매칭 시점: 각 항목의 Beta 분포에서 샘플링 → 가중치 맵 반환.
     * 베타 분포 샘플링 = Gamma(α)/(Gamma(α)+Gamma(β))로 근사.
     * GowerDistanceService.DEFAULT_WEIGHTS 베이스 × Beta 샘플 스케일.
     */
    public Map<String, Double> sampleWeights() {
        Map<String, Double> result = new LinkedHashMap<>();
        List<MatchingWeight> all = repository.findAll();
        Map<String, MatchingWeight> byName = new HashMap<>();
        for (MatchingWeight w : all) byName.put(w.getFeatureName(), w);

        for (String feature : GowerDistanceService.FEATURE_NAMES) {
            MatchingWeight w = byName.get(feature);
            double baseline = GowerDistanceService.DEFAULT_WEIGHTS.getOrDefault(feature, 1.0);
            if (w == null) {
                result.put(feature, baseline);
                continue;
            }
            // Beta 분포에서 샘플링 (0~1)
            double sample = betaSample(w.getAlpha(), w.getBeta());
            // baseline × (0.5 + sample) → 0.5×baseline ~ 1.5×baseline 범위
            // exploration 폭은 0.5×baseline, exploitation 중심은 baseline
            double finalWeight = baseline * (0.5 + sample);
            result.put(feature, finalWeight);
        }
        return result;
    }

    /**
     * Decision time 가중치 — Thompson 샘플링 대신 기댓값 사용.
     * 운영 모니터링용 / 새 멘티에게 가장 안정된 가중치 제공할 때.
     */
    public Map<String, Double> expectedWeights() {
        Map<String, Double> result = new LinkedHashMap<>();
        List<MatchingWeight> all = repository.findAll();
        Map<String, MatchingWeight> byName = new HashMap<>();
        for (MatchingWeight w : all) byName.put(w.getFeatureName(), w);

        for (String feature : GowerDistanceService.FEATURE_NAMES) {
            MatchingWeight w = byName.get(feature);
            double baseline = GowerDistanceService.DEFAULT_WEIGHTS.getOrDefault(feature, 1.0);
            if (w == null) {
                result.put(feature, baseline);
                continue;
            }
            double expectedSample = w.expectedValue(); // α/(α+β)
            result.put(feature, baseline * (0.5 + expectedSample));
        }
        return result;
    }

    /**
     * 피드백 반영 — 항목별 α/β 업데이트.
     *
     * @param contributions  매칭에서 항목별 기여도 (0~1, 합=matchScore)
     * @param success         매칭 성공 여부 (rating>=4 && resolved)
     */
    @Transactional
    public void updateFromFeedback(Map<String, Double> contributions, boolean success) {
        if (contributions == null || contributions.isEmpty()) return;
        for (Map.Entry<String, Double> e : contributions.entrySet()) {
            String feature = e.getKey();
            double contribution = e.getValue();
            MatchingWeight w = repository.findByFeatureName(feature).orElse(null);
            if (w == null) continue;

            // 기여도가 큰 항목일수록 학습 신호 강함
            // 단, 학습 안정성 위해 contribution × 2.0으로 스케일링 (최대 2 증분/피드백)
            double delta = contribution * 2.0;
            if (success) {
                w.setAlpha(w.getAlpha() + delta);
            } else {
                w.setBeta(w.getBeta() + delta);
            }
            w.setUpdatedAt(LocalDateTime.now());
            repository.save(w);
        }
        log.info("[ThompsonSampling] 피드백 반영 완료 — success={}", success);
    }

    // ─────────────────────────────────────────────────────────────────
    //  Beta 분포 샘플링 (Gamma 분포 기반)
    // ─────────────────────────────────────────────────────────────────

    /** Beta(α, β) 분포 샘플링. X = G(α) / (G(α) + G(β)) where G ~ Gamma. */
    private double betaSample(double alpha, double beta) {
        double x = gammaSample(alpha);
        double y = gammaSample(beta);
        double denom = x + y;
        return denom > 0 ? x / denom : 0.5;
    }

    /**
     * Gamma(k, 1) 샘플링 — Marsaglia & Tsang 방법 (k >= 1).
     * k < 1 은 G(k+1) × U^(1/k) trick으로 처리.
     */
    private double gammaSample(double k) {
        if (k < 1.0) {
            return gammaSample(k + 1.0) * Math.pow(random.nextDouble(), 1.0 / k);
        }
        double d = k - 1.0 / 3.0;
        double c = 1.0 / Math.sqrt(9.0 * d);
        while (true) {
            double x, v;
            do {
                x = random.nextGaussian();
                v = 1.0 + c * x;
            } while (v <= 0);
            v = v * v * v;
            double u = random.nextDouble();
            if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
        }
    }

    /** 모니터링용 — 현재 분포 스냅샷 */
    public Map<String, Map<String, Double>> snapshot() {
        Map<String, Map<String, Double>> out = new LinkedHashMap<>();
        for (MatchingWeight w : repository.findAll()) {
            Map<String, Double> info = new LinkedHashMap<>();
            info.put("alpha", w.getAlpha());
            info.put("beta", w.getBeta());
            info.put("expected", w.expectedValue());
            out.put(w.getFeatureName(), info);
        }
        return out;
    }
}
