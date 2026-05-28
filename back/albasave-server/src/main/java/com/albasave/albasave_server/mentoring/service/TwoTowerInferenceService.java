package com.albasave.albasave_server.mentoring.service;

import com.albasave.albasave_server.mentoring.domain.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Two-tower 신경망 forward pass (Java 자체 구현, 외부 ML 런타임 불필요).
 *
 * <h3>구조</h3>
 * <pre>
 *   profile (62-dim multi-hot)
 *      ↓
 *      MLP [62 → 64 → 32 → 16] + ReLU
 *      ↓
 *      L2 normalize
 *      ↓
 *   embedding (16-dim)
 * </pre>
 *
 * <h3>가중치 로드</h3>
 * 1. 앱 기동 시 {@code two-tower.weights-path}(기본 /home/ubuntu/app/back/two_tower_weights.json) 시도
 * 2. 실패 시 classpath:two_tower_weights.json 시도
 * 3. 둘 다 실패 → {@code isReady() == false} → 매칭은 Gower만 사용 (graceful degradation)
 *
 * <h3>학습</h3>
 * {@code ml/mentoring/} 의 Python 스크립트로 학습 후 가중치 JSON export.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TwoTowerInferenceService {

    private final ObjectMapper objectMapper;

    @Value("${two-tower.weights-path:/home/ubuntu/app/back/two_tower_weights.json}")
    private String weightsPath;

    private volatile boolean ready = false;
    private int inputDim;

    // 멘토 tower
    private float[][] mentorFc1W; private float[] mentorFc1B;
    private float[][] mentorFc2W; private float[] mentorFc2B;
    private float[][] mentorFc3W; private float[] mentorFc3B;
    // 멘티 tower
    private float[][] menteeFc1W; private float[] menteeFc1B;
    private float[][] menteeFc2W; private float[] menteeFc2B;
    private float[][] menteeFc3W; private float[] menteeFc3B;

    // 카테고리 → 입력 인덱스 매핑
    private Map<String, FeatureLayout> layout = new HashMap<>();

    private record FeatureLayout(int start, int size, List<String> values) {}

    @EventListener(ApplicationReadyEvent.class)
    public void load() {
        try {
            JsonNode root = readWeights();
            if (root == null) {
                log.warn("[TwoTower] 가중치 JSON 미발견 — 신경망 비활성. Gower만 사용");
                return;
            }

            inputDim = root.path("input_dim").asInt();
            log.info("[TwoTower] inputDim={}", inputDim);

            // feature_layout 파싱
            JsonNode layouts = root.path("feature_layout");
            for (java.util.Iterator<Map.Entry<String, JsonNode>> it = layouts.fields(); it.hasNext(); ) {
                Map.Entry<String, JsonNode> e = it.next();
                JsonNode v = e.getValue();
                List<String> values = new java.util.ArrayList<>();
                v.path("values").forEach(n -> values.add(n.asText()));
                layout.put(e.getKey(), new FeatureLayout(
                        v.path("start").asInt(), v.path("size").asInt(), values));
            }

            // 멘토 tower 가중치 로드
            JsonNode m = root.path("mentor_tower");
            mentorFc1W = readMatrix(m.path("fc1").path("weight"));
            mentorFc1B = readVector(m.path("fc1").path("bias"));
            mentorFc2W = readMatrix(m.path("fc2").path("weight"));
            mentorFc2B = readVector(m.path("fc2").path("bias"));
            mentorFc3W = readMatrix(m.path("fc3").path("weight"));
            mentorFc3B = readVector(m.path("fc3").path("bias"));

            // 멘티 tower
            JsonNode u = root.path("mentee_tower");
            menteeFc1W = readMatrix(u.path("fc1").path("weight"));
            menteeFc1B = readVector(u.path("fc1").path("bias"));
            menteeFc2W = readMatrix(u.path("fc2").path("weight"));
            menteeFc2B = readVector(u.path("fc2").path("bias"));
            menteeFc3W = readMatrix(u.path("fc3").path("weight"));
            menteeFc3B = readVector(u.path("fc3").path("bias"));

            ready = true;
            log.info("[TwoTower] 신경망 가중치 로드 완료. nParams={}",
                    root.path("meta").path("n_params").asInt());
        } catch (Exception e) {
            log.warn("[TwoTower] 가중치 로드 실패 — Gower만 사용: {}", e.getMessage());
            ready = false;
        }
    }

    private JsonNode readWeights() throws Exception {
        // 1) 외부 파일
        File ext = new File(weightsPath);
        if (ext.exists() && ext.isFile()) {
            log.info("[TwoTower] 외부 가중치 파일 로드: {}", ext.getAbsolutePath());
            return objectMapper.readTree(Files.readAllBytes(ext.toPath()));
        }
        // 2) classpath
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("two_tower_weights.json")) {
            if (in != null) {
                log.info("[TwoTower] classpath 가중치 로드");
                return objectMapper.readTree(in);
            }
        }
        return null;
    }

    private float[][] readMatrix(JsonNode arr) {
        int rows = arr.size();
        int cols = arr.get(0).size();
        float[][] out = new float[rows][cols];
        for (int i = 0; i < rows; i++) {
            JsonNode r = arr.get(i);
            for (int j = 0; j < cols; j++) {
                out[i][j] = (float) r.get(j).asDouble();
            }
        }
        return out;
    }

    private float[] readVector(JsonNode arr) {
        int n = arr.size();
        float[] out = new float[n];
        for (int i = 0; i < n; i++) out[i] = (float) arr.get(i).asDouble();
        return out;
    }

    public boolean isReady() {
        return ready;
    }

    // ─────────────────────────────────────────────────────────────────
    //  추론: profile → embedding → cosine similarity
    // ─────────────────────────────────────────────────────────────────

    /**
     * 멘토 vs 멘티 매칭 점수 (0~1). 신경망 미적재 시 null.
     */
    public Double score(MentorProfile mentor, MenteeMatchRequest request) {
        if (!ready) return null;
        try {
            float[] mentorInput = encodeMentor(mentor);
            float[] menteeInput = encodeMentee(request);
            float[] mEmb = forwardMentorTower(mentorInput);
            float[] uEmb = forwardMenteeTower(menteeInput);
            float cosine = dot(mEmb, uEmb);
            // [-1, 1] → [0, 1]
            return (double) ((cosine + 1.0f) / 2.0f);
        } catch (Exception e) {
            log.warn("[TwoTower] 추론 실패: {}", e.getMessage());
            return null;
        }
    }

    private float[] encodeMentor(MentorProfile p) {
        float[] vec = new float[inputDim];
        oneHot(vec, "industry", p.getIndustry() != null ? p.getIndustry().name() : null);
        if (p.getDamageTypes() != null) {
            for (DamageType dt : p.getDamageTypes()) multiHot(vec, "damage_types", dt.name());
        }
        oneHot(vec, "employment_type", p.getEmploymentType() != null ? p.getEmploymentType().name() : null);
        oneHot(vec, "business_size", p.getBusinessSize() != null ? p.getBusinessSize().name() : null);
        oneHot(vec, "region", p.getRegion() != null ? p.getRegion().name() : null);
        oneHot(vec, "damage_amount", p.getDamageAmountRange() != null ? p.getDamageAmountRange().name() : null);
        return vec;
    }

    private float[] encodeMentee(MenteeMatchRequest r) {
        float[] vec = new float[inputDim];
        oneHot(vec, "industry", r.getIndustry() != null ? r.getIndustry().name() : null);
        if (r.getDamageTypes() != null) {
            for (DamageType dt : r.getDamageTypes()) multiHot(vec, "damage_types", dt.name());
        }
        oneHot(vec, "employment_type", r.getEmploymentType() != null ? r.getEmploymentType().name() : null);
        oneHot(vec, "business_size", r.getBusinessSize() != null ? r.getBusinessSize().name() : null);
        oneHot(vec, "region", r.getRegion() != null ? r.getRegion().name() : null);
        oneHot(vec, "damage_amount", r.getDamageAmountRange() != null ? r.getDamageAmountRange().name() : null);
        return vec;
    }

    private void oneHot(float[] vec, String feature, String value) {
        if (value == null) return;
        FeatureLayout f = layout.get(feature);
        if (f == null) return;
        int idx = f.values().indexOf(value);
        if (idx >= 0) vec[f.start() + idx] = 1.0f;
    }

    private void multiHot(float[] vec, String feature, String value) {
        oneHot(vec, feature, value);
    }

    private float[] forwardMentorTower(float[] x) {
        float[] h1 = relu(linear(x, mentorFc1W, mentorFc1B));
        float[] h2 = relu(linear(h1, mentorFc2W, mentorFc2B));
        float[] out = linear(h2, mentorFc3W, mentorFc3B);
        return l2Normalize(out);
    }

    private float[] forwardMenteeTower(float[] x) {
        float[] h1 = relu(linear(x, menteeFc1W, menteeFc1B));
        float[] h2 = relu(linear(h1, menteeFc2W, menteeFc2B));
        float[] out = linear(h2, menteeFc3W, menteeFc3B);
        return l2Normalize(out);
    }

    /** y = W x + b. PyTorch는 W가 [out, in]이므로 in 차원으로 dot product. */
    private float[] linear(float[] x, float[][] W, float[] b) {
        int outDim = W.length;
        int inDim = W[0].length;
        float[] out = new float[outDim];
        for (int i = 0; i < outDim; i++) {
            float sum = b[i];
            for (int j = 0; j < inDim; j++) sum += W[i][j] * x[j];
            out[i] = sum;
        }
        return out;
    }

    private float[] relu(float[] x) {
        float[] out = new float[x.length];
        for (int i = 0; i < x.length; i++) out[i] = Math.max(0, x[i]);
        return out;
    }

    private float[] l2Normalize(float[] x) {
        float sumSq = 0;
        for (float v : x) sumSq += v * v;
        float norm = (float) Math.sqrt(Math.max(sumSq, 1e-12));
        float[] out = new float[x.length];
        for (int i = 0; i < x.length; i++) out[i] = x[i] / norm;
        return out;
    }

    private float dot(float[] a, float[] b) {
        float s = 0;
        for (int i = 0; i < a.length; i++) s += a[i] * b[i];
        return s;
    }
}
