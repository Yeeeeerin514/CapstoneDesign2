package com.albasave.albasave_server.report.service;

import com.albasave.albasave_server.report.dto.AiDraftContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Gemini 모델을 호출해 고용노동부 진정서의 '진정 내용' 초안을 생성한다.
 *
 * 사용자가 제공한 사실(자유 서술 + 피해 유형 + 진정 내용 폼 + 사업장 정보)만으로 작성하며,
 * 제공되지 않은 정보는 절대 지어내지 않는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiAiService {
    @Value("${gemini.api.key:}")
    private String apiKey;

    // 모델: gemini.model 프로퍼티(또는 GEMINI_MODEL 환경변수)로 변경 가능.
    // 기본값은 무료 쿼터 친화적인 gemini-1.5-flash. (2.0-flash는 키 프로젝트에 무료 쿼터가 없을 수 있음)
    @Value("${gemini.model:gemini-2.5-flash}")
    private String model;
    private static final String BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/";

    private static final String SYSTEM_PROMPT = """
            당신은 고용노동부 진정서 작성을 전문으로 하는 노무사입니다.
            근로자(피해자)가 제공한 제한된 정보만으로 고용노동부 진정서의 '진정 내용' 섹션을 작성합니다.

            [출력 형식 — 매우 중요]
            - 반드시 완결된 문장으로 이루어진 줄글(서술형 산문)로 작성합니다.
            - "입사일: 2020-03-05", "피해 유형: ...", "상황설명: ..."처럼 항목명과 값을 나열하는
              목록·표·키(라벨):값 형식을 절대 사용하지 않습니다.
            - 2~3개의 자연스러운 문단으로 구성합니다.

            [포함 내용]
            진정인이 언제부터(입사일) 어느 사업장에서 근무했는지로 시작해, 어떤 임금이 미지급되었는지
            (선택한 피해 유형)와 그 정황(근로자 진술), 그리고 체불 임금 총액을 하나의 서술로 자연스럽게 엮습니다.

            [작성 원칙]
            1. 반드시 제공된 사실에만 근거하며, 입력에 없는 정보(근무시간·담당 업무·시급·계약 방식 등)는
               절대 지어내지 않습니다.
            2. 근로자의 자연어 진술을 그대로 복사해 붙이지 말고, 진정서 문체(객관적·격식체)로 다시 풀어 씁니다.
            3. 값이 "(미입력)"인 항목은 추측하지 말고 '[입사일]', '[금액]'처럼 자리표시자로 남기거나
               자연스럽게 생략합니다.
            4. 선택된 피해 유형은 빠짐없이 본문 서술에 반영합니다.
            5. 감정적 표현 없이 객관적으로 기술하고, 마지막 문단에서 체불 임금의 지급 등 이행을 요청합니다.
            6. 관련 법적 근거(근로기준법 등)는 일반적으로 확립된 범위에서만 괄호로 덧붙일 수 있습니다.
            7. 전체 분량 300자 이내, 제목·머리말·맺음말 없이 본문만 한국어로 작성합니다.

            [원하는 문체 예시]
            "진정인은 2020년 3월 5일부터 OO에서 근무하였습니다. 그러나 피진정인은 기본급과 주휴수당 등
            합계 120,000원을 지급기일이 지났음에도 현재까지 지급하지 않고 있습니다. 이에 진정인은
            체불된 임금의 조속한 지급을 요청합니다."
            """;

    // RestTemplate 빈을 별도 등록하지 않고 자체 보유 (FcmService와 동일 패턴).
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Gemini API를 호출하여 진정서 '진정 내용' 초안을 생성합니다.
     *
     * 요청 URL: POST https://generativelanguage.googleapis.com/v1beta/models
     *                  /gemini-2.0-flash:generateContent?key={API_KEY}
     */
    public String generatePetitionContent(AiDraftContext ctx) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY가 설정되지 않았습니다.");
        }

        String url = BASE_URL + model + ":generateContent?key=" + apiKey;
        String userMessage = buildUserMessage(ctx);

        Map<String, Object> requestBody = Map.of(
                "system_instruction", Map.of(
                        "parts", List.of(Map.of("text", SYSTEM_PROMPT))
                ),
                "contents", List.of(
                        Map.of(
                                "role", "user",
                                "parts", List.of(Map.of("text", userMessage))
                        )
                ),
                "generationConfig", Map.of(
                        "maxOutputTokens", 1500,
                        "temperature", 0.4   // 사실 기반 작성: 창의성 낮춤
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        log.info("Gemini 요청 시작 — model={}", model);
        try {
            ResponseEntity<Map> response =
                    restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            log.info("Gemini 응답 수신 — status={}", response.getStatusCode());
            return extractText(response.getBody());
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("Gemini API 클라이언트 오류 — status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("AI 진정서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.", e);
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            log.error("Gemini API 서버 오류 — status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("AI 진정서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.", e);
        } catch (RuntimeException e) {
            log.error("Gemini API 호출 실패: {}", e.getMessage(), e);
            throw new RuntimeException("AI 진정서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
    }

    /**
     * Gemini 응답 파싱.
     * 구조: { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
     */
    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> body) {
        if (body == null) {
            throw new IllegalStateException("Gemini 응답이 비어 있습니다.");
        }
        List<Map<String, Object>> candidates =
                (List<Map<String, Object>>) body.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new IllegalStateException("Gemini 응답에 candidates가 없습니다: " + body);
        }
        Map<String, Object> content =
                (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts =
                (List<Map<String, Object>>) content.get("parts");
        if (parts == null || parts.isEmpty()) {
            throw new IllegalStateException("Gemini 응답에 본문(parts)이 없습니다.");
        }
        return ((String) parts.get(0).get("text")).trim();
    }

    private String buildUserMessage(AiDraftContext ctx) {
        String typeBlock = (ctx.damageTypeLabels() == null || ctx.damageTypeLabels().isEmpty())
                ? "  - (미입력)"
                : ctx.damageTypeLabels().stream()
                        .map(label -> "  - " + label)
                        .reduce((a, b) -> a + "\n" + b)
                        .orElse("  - (미입력)");

        return String.format("""
                아래는 진정 내용 작성에 쓸 '참고 자료'입니다. 항목을 그대로 나열하지 말고,
                이 사실들을 엮어 줄글(서술형 문장)로 '진정 내용'을 작성해 주세요.
                "(미입력)" 항목은 지어내지 마세요.

                - 사업장(피진정인): %s
                - 입사일: %s
                - 체불 임금 총액: %s
                - 체불(피해) 유형:
                %s
                - 근로자 자연어 진술(그대로 베끼지 말고 격식체로 재서술): %s
                """,
                text(ctx.businessName()),
                text(ctx.employmentStartDate()),
                won(ctx.totalUnpaidWage()),
                typeBlock,
                text(ctx.freeFormDescription())
        );
    }

    private String text(String value) {
        return (value == null || value.isBlank()) ? "(미입력)" : value.trim();
    }

    private String won(Integer value) {
        return (value == null) ? "(미입력)" : String.format("%,d원", value);
    }
}
