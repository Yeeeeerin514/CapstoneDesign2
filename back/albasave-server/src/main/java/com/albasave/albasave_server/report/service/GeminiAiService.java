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

    // 모델 변경 시 이 값만 수정하면 됩니다
    private static final String MODEL = "gemini-2.0-flash";
    private static final String BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/";

    private static final String SYSTEM_PROMPT = """
            당신은 고용노동부 진정서 작성을 전문으로 하는 노무사입니다.
            알바생(피해자)의 임금체불 상황을 입력받아 고용노동부 진정서의 '진정 내용' 섹션을 작성합니다.

            진정 내용은 반드시 다음 두 부분을 포함합니다.
            (가) 근로 관계: 진정인이 언제부터(입사일) 어느 사업장에서 어떤 시간대에(근무시간) 근무했고,
                 어떤 업무를 담당했는지 서술합니다.
            (나) 체불 현황: 임금체불 피해 상황, 체불 임금액 및 기타 체불금(주휴·연장·야간수당, 퇴직금 등),
                 체불 기간을 서술합니다.

            작성 원칙:
            1. 반드시 제공된 사실에만 근거합니다. 입력에 없는 금액·날짜·정황을 절대 지어내지 않습니다.
            2. 값이 "(미입력)"인 항목은 사용자가 제공하지 않은 것이므로, 추측하지 말고
               본문에서 '[입사일]', '[금액]'처럼 자리표시자로 남기거나 자연스럽게 생략합니다.
            3. 선택된 체불 유형을 빠짐없이 반영하고, 유형별로 단락을 나눠 서술합니다.
            4. 관련 법적 근거(근로기준법 조항 등)는 일반적으로 확립된 범위에서만 괄호로 명시합니다.
            5. 감정적 표현 없이 객관적 사실만 기술하고, 결론 단락에 체불 임금 지급 등 이행을 요청합니다.
            6. 전체 분량은 300~500자 내외, 머리말·맺음말 없이 '진정 내용' 본문만 한국어로 작성합니다.
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

        String url = BASE_URL + MODEL + ":generateContent?key=" + apiKey;
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
                아래 사실만으로 진정서 '진정 내용'을 작성해 주세요. "(미입력)" 항목은 지어내지 마세요.

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
                - 근로자 자연어 서술: %s
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
