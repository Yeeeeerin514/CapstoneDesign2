package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.config.OpenAiProperties;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import com.albasave.albasave_server.jobposting.dto.LlmConcern;
import com.albasave.albasave_server.lawapi.dto.LawChunkMatch;
import com.albasave.albasave_server.lawapi.service.LegalContextService;
import com.albasave.albasave_server.report.service.WageCalculationService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * [RAG 2차 판단] 공고문 우려사항 재판단 — 계약서 분석(LaborContractAnalysisService)과 동일 패턴.
 * 1차 Vision 추출 결과를 법령·판례 의미 검색 컨텍스트와 함께 text-only LLM(gpt-4o-mini)에 보내
 * "법적 근거가 있는 우려"만 생성하게 한다.
 *
 * 목적:
 * - '무단결근 시 불이익' 같은 일반 안내 조항이 위험으로 표시되는 과적용 차단
 * - 룰베이스(최저임금/협의/위약금/누락정보)가 따로 다루는 항목과의 의미 중복 차단
 *
 * 실패(키 미설정·호출 오류·파싱 실패) 시 Optional.empty()를 반환하고,
 * 호출부는 기존 1차 추출 llmConcerns를 그대로 사용한다(기존 동작 보존).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobPostingLegalJudge {

    private final OpenAiProperties openAiProperties;
    private final ObjectMapper objectMapper;
    private final LegalContextService legalContextService;

    public Optional<List<LlmConcern>> judge(ExtractedJobPosting posting) {
        if (!openAiProperties.isConfigured() || posting == null) return Optional.empty();

        try {
            String query = buildRetrievalQuery(posting);
            List<LawChunkMatch> articles =
                    legalContextService.searchSimilarByTypes(query, 4, List.of("LAW"));
            List<LawChunkMatch> cases = legalContextService.searchSimilarByTypes(
                    query, 3, List.of("PRECEDENT", "INTERPRETATION"));

            String prompt = buildJudgePrompt(posting, articles, cases);

            RestClient client = RestClient.create();
            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", "gpt-4o-mini",
                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "max_tokens", 900,
                    "temperature", 0
            ));
            String response = client.post()
                    .uri(openAiProperties.baseUrl() + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiProperties.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            JsonNode parsed = objectMapper.readTree(cleanJson(content));
            JsonNode arr = parsed.path("concerns");
            if (!arr.isArray()) return Optional.empty();

            List<LlmConcern> judged =
                    objectMapper.convertValue(arr, new TypeReference<List<LlmConcern>>() {});
            log.info("[공고 RAG judge] 조문 {}건/판례 {}건 컨텍스트 → 우려 {}건",
                    articles.size(), cases.size(), judged.size());
            return Optional.of(judged);
        } catch (Exception e) {
            log.warn("[공고 RAG judge 실패] {} — 1차 추출 우려사항으로 폴백", e.getMessage());
            return Optional.empty();
        }
    }

    /** 추출 정보로 의미 검색 쿼리 구성 — 수치·의심 문구를 자연어로 풀어 임베딩 신호 강화. */
    private String buildRetrievalQuery(ExtractedJobPosting p) {
        StringBuilder sb = new StringBuilder("아르바이트 구인공고 ");
        if (p.hourlyWage() != null) {
            sb.append("시급 ").append(p.hourlyWage()).append("원 ");
        } else if (p.hourlyWageText() != null && !p.hourlyWageText().isBlank()) {
            sb.append("급여 ").append(p.hourlyWageText()).append(' ');
        }
        if (p.workTimeText() != null && !p.workTimeText().isBlank()) {
            sb.append("근무시간 ").append(p.workTimeText()).append(' ');
        }
        if (p.suspiciousPhrases() != null && !p.suspiciousPhrases().isEmpty()) {
            sb.append(String.join(" ", p.suspiciousPhrases())).append(' ');
        }
        sb.append("임금 주휴수당 위약금 근로계약");
        return sb.toString().trim();
    }

    private String buildJudgePrompt(
            ExtractedJobPosting posting,
            List<LawChunkMatch> articles,
            List<LawChunkMatch> cases
    ) {
        String factsJson;
        try {
            factsJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(posting);
        } catch (Exception e) {
            factsJson = posting.toString();
        }

        StringBuilder ctx = new StringBuilder();
        for (int i = 0; i < articles.size(); i++) {
            LawChunkMatch m = articles.get(i);
            ctx.append("【조문 ").append(i + 1).append("】 ").append(m.header()).append('\n')
               .append(truncate(m.content(), 500)).append("\n\n");
        }
        if (ctx.length() == 0) ctx.append("(검색된 관련 조문이 없습니다)\n");

        StringBuilder casesCtx = new StringBuilder();
        for (int i = 0; i < cases.size(); i++) {
            LawChunkMatch m = cases.get(i);
            casesCtx.append("【사례 ").append(i + 1).append("】 ").append(m.header()).append('\n')
                    .append(truncate(m.content(), 400)).append("\n\n");
        }
        if (casesCtx.length() == 0) casesCtx.append("(관련 판례·해석례 없음)\n");

        return """
                당신은 한국 근로기준법 전문가입니다. 아르바이트 '구인공고'에서 추출된 정보가 주어집니다.
                공고 단계에서 지원자가 알아야 할 "법적 근거가 있는 우려"만 JSON으로 응답하세요.

                [규칙]
                1. 제공된 조문/판례에 근거가 있을 때만 우려 생성. 추측·일반화 금지. 값이 null인 필드는 판단 보류.
                2. 다음 주제는 별도 룰베이스가 이미 생성하므로 절대 만들지 마세요:
                   최저임금 미달, 주휴수당 포함 표기, 위약금·벌금·손해배상 문구,
                   협의·급구 등 조건 불명확, 공고에 안 보이는 정보(누락) 지적.
                3. 당연하거나 일반적인 안내 조항은 우려가 아닙니다 — 제외:
                   단순 '무단결근/지각 시 불이익' 고지, 4대보험 가입 안내, 면접 절차 안내, 복장·태도 요구 등.
                   단, 임금 미지급·임금 공제·손해배상 예정 등 위법 소지가 구체적으로 드러나면 포함.
                4. 같은 사안은 1건만. 비슷한 제목 반복 금지.
                5. evidence는 공고 원문 인용(20자 이내). 인용이 불가능하면 그 항목은 제외.
                6. category: WAGE | ALLOWANCE | CONDITION | PENALTY | CONTRACT | POSTING_PATTERN
                   severity: HIGH | MEDIUM | LOW
                7. 우려가 없으면 빈 배열. JSON 외 텍스트 절대 출력 금지.
                참고: 2026년 최저시급은 %,d원입니다.

                === (A) 공고 추출 정보 ===
                %s

                === (B) 관련 법령 조문 ===
                %s

                === (C) 관련 판례·해석례 (참고 — 같은 사실관계에서 어떻게 판단됐는지) ===
                %s

                === 응답 형식 ===
                {"concerns":[{"category":"CONDITION","severity":"MEDIUM","title":"제목","description":"설명","evidence":"원문 인용"}]}
                """.formatted(
                WageCalculationService.MINIMUM_WAGE_2026, factsJson, ctx.toString(), casesCtx.toString());
    }

    private String cleanJson(String raw) {
        if (raw == null) return "{}";
        String s = raw.trim();
        if (s.startsWith("```")) {
            s = s.replaceAll("^```(json)?\\s*", "").replaceAll("\\s*```\\s*$", "");
        }
        return s.trim();
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + " …";
    }
}
