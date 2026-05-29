package com.albasave.albasave_server.lawapi.service;

import com.albasave.albasave_server.jobposting.config.OpenAiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * OpenAI Embeddings API 클라이언트.
 * 모델: text-embedding-3-small (1536차원, $0.02/1M tokens)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiEmbeddingClient {

    public static final int DIMENSIONS = 1536;
    private static final String EMBEDDING_MODEL = "text-embedding-3-small";
    private static final int BATCH_SIZE = 100;

    private final OpenAiProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.create();

    /** 단일 텍스트 → 1536차원 벡터. 실패 시 null. */
    public float[] embed(String text) {
        List<float[]> result = embedBatch(List.of(text));
        return result.isEmpty() ? null : result.get(0);
    }

    /**
     * 여러 텍스트를 한 번에 임베딩 (최대 100개 권장).
     * 입력 순서와 동일한 순서로 반환.
     */
    public List<float[]> embedBatch(List<String> texts) {
        if (!properties.isConfigured()) {
            log.warn("[Embedding] OPENAI_API_KEY 미설정 — 임베딩 건너뜀");
            return List.of();
        }
        if (texts == null || texts.isEmpty()) return List.of();

        List<float[]> all = new ArrayList<>(texts.size());
        for (int i = 0; i < texts.size(); i += BATCH_SIZE) {
            List<String> slice = texts.subList(i, Math.min(i + BATCH_SIZE, texts.size()));
            try {
                String body = objectMapper.writeValueAsString(Map.of(
                        "model", EMBEDDING_MODEL,
                        "input", slice
                ));
                String response = restClient.post()
                        .uri(properties.baseUrl() + "/embeddings")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(response);
                JsonNode data = root.path("data");
                if (!data.isArray()) {
                    log.warn("[Embedding] 응답 data 배열 누락: {}", response);
                    return List.of();
                }
                for (JsonNode item : data) {
                    JsonNode emb = item.path("embedding");
                    float[] vec = new float[emb.size()];
                    for (int j = 0; j < emb.size(); j++) {
                        vec[j] = (float) emb.get(j).asDouble();
                    }
                    all.add(vec);
                }
                log.info("[Embedding] {}개 임베딩 완료 (batch {}~{})", slice.size(), i, i + slice.size());
            } catch (Exception e) {
                log.error("[Embedding] batch {}~{} 실패: {}", i, i + slice.size(), e.getMessage());
                return List.of();
            }
        }
        return all;
    }

    /** 벡터를 pgvector 호환 문자열로 변환. 예: "[0.1,0.2,...]" */
    public static String toVectorLiteral(float[] vec) {
        StringBuilder sb = new StringBuilder(vec.length * 12);
        sb.append('[');
        for (int i = 0; i < vec.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(vec[i]);
        }
        sb.append(']');
        return sb.toString();
    }
}
