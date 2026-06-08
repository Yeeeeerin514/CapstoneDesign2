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
            알바생(피해자)의 임금체불 상황을 입력받아 고용노동부 진정서의 '진정 내용' 섹션을 작성합니다.

            [출력 형식 — 매우 중요]
            - 반드시 완결된 문장으로 이루어진 줄글(서술형 산문)로 작성합니다.
            - "입사일: 2020-03-05", "피해 유형: ...", "상황설명: ..."처럼 항목명과 값을 나열하는
              목록·표·키(라벨):값 형식을 절대 사용하지 않습니다.
            - 2~3개의 자연스러운 문단으로 구성합니다.

            [포함 내용]
            (가) 근로 관계: 진정인이 언제부터 어느 사업장에서 어떤 시간대에 근무했고 어떤 업무를
                 담당했는지를 한 문단의 서술로 풀어 씁니다.
            (나) 체불 현황: 어떤 임금이 얼마나, 어느 기간 동안 미지급되었는지를 서술합니다.
                 이때 근로자가 자연어로 진술한 상황과 선택한 피해 유형(기본급·주휴·연장·야간수당·퇴직금 등)을
                 분리해 나열하지 말고, 하나의 이야기로 자연스럽게 엮어 서술합니다.

            [작성 원칙]
            1. 반드시 제공된 사실에만 근거하며, 입력에 없는 금액·날짜·정황을 지어내지 않습니다.
            2. 근로자의 자연어 진술을 그대로 복사해 붙이지 말고, 진정서 문체(객관적·격식체)로 다시 풀어 씁니다.
            3. 값이 "(미입력)"인 항목은 추측하지 말고 '[입사일]', '[금액]'처럼 자리표시자로 남기거나
               자연스럽게 생략합니다.
            4. 선택된 피해 유형은 빠짐없이 본문 서술에 반영합니다.
            5. 감정적 표현 없이 객관적으로 기술하고, 마지막 문단에서 체불 임금의 지급 등 이행을 요청합니다.
            6. 관련 법적 근거(근로기준법 등)는 일반적으로 확립된 범위에서만 괄호로 덧붙일 수 있습니다.
            7. 전체 분량 300~500자, 제목·머리말·맺음말 없이 '진정 내용' 본문(줄글)만 한국어로 작성합니다.

            [원하는 문체 예시]
            "진정인은 2020년 3월 5일부터 OO에서 주 3일 오전 9시부터 오후 6시까지 매장 업무를 담당하며
            근무하였습니다. 그러나 피진정인은 같은 해 12월분 기본급과 주휴수당 합계 120,000원을 지급기일이
            지났음에도 현재까지 지급하지 않고 있습니다. 이에 진정인은 체불된 임금의 조속한 지급을 요청합니다."
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

        try {
            ResponseEntity<Map> response =
                    restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            return extractText(response.getBody());
        } catch (RuntimeException e) {
            log.error("Gemini API 호출 실패: {}", e.getMessage());
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

                [근로 관계]
                - 사업장: %s
                - 사업장 주소: %s
                - 근무 기간: %s ~ %s (%s)
                - 근무 시간: %s
                - 담당 업무: %s
                - 약정 시급: %s
                - 근로계약 방식: %s

                [체불 현황]
                - 체불(피해) 유형:
                %s
                - 근로자 자연어 진술(그대로 베끼지 말고 격식체로 재서술): %s
                - 체불 임금액: %s
                - 미지급 퇴직금: %s
                - 기타 체불금(주휴·연장·야간 등): %s
                - 임금 지급(예정)일: %s
                """,
                text(ctx.businessName()),
                text(ctx.businessAddress()),
                text(ctx.employmentStartDate()), text(ctx.employmentEndDate()),
                text(ctx.employmentStatusLabel()),
                text(ctx.workSchedule()),
                text(ctx.jobDescription()),
                won(ctx.hourlyWage()),
                text(ctx.contractMethodLabel()),
                typeBlock,
                text(ctx.freeFormDescription()),
                won(ctx.totalUnpaidWage()),
                won(ctx.unpaidSeverance()),
                won(ctx.otherUnpaid()),
                text(ctx.wagePaymentDate())
        );
    }

    private String text(String value) {
        return (value == null || value.isBlank()) ? "(미입력)" : value.trim();
    }

    private String won(Integer value) {
        return (value == null) ? "(미입력)" : String.format("%,d원", value);
    }
}
