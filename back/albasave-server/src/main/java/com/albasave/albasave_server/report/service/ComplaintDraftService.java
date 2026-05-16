package com.albasave.albasave_server.report.service;

import com.albasave.albasave_server.jobposting.config.OpenAiProperties;
import com.albasave.albasave_server.report.domain.AnalysisLog;
import com.albasave.albasave_server.workinglog.domain.User;
import com.albasave.albasave_server.workinglog.repository.UserRepository;
import com.albasave.albasave_server.workinglog.repository.WorkingRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplaintDraftService {

    private final OpenAiProperties openAiProperties;
    private final UserRepository userRepository;
    private final WorkingRepository workingRepository;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일 HH:mm");
    private static final DateTimeFormatter D_FMT = DateTimeFormatter.ofPattern("yyyy년 MM월 dd일");

    public String generateComplaintDraft(AnalysisLog log, WageCalculationService.WageCalculationResult wage) {
        User user = userRepository.findById(log.getUserId()).orElse(null);
        String userName = user != null ? user.getName() : "신청인";
        String userPhone = user != null ? (user.getPhoneNumber() != null ? user.getPhoneNumber() : "") : "";

        var workingRecords = workingRepository.findByPartTimeJobIdOrderByRealStartTimeDesc(
                log.getPartTimeJobId() != null ? log.getPartTimeJobId() : 0L);

        StringBuilder workLog = new StringBuilder();
        for (var w : workingRecords) {
            if (w.getRealStartTime() != null && w.getRealEndTime() != null) {
                workLog.append("  - ").append(w.getRealStartTime().format(DT_FMT))
                        .append(" ~ ").append(w.getRealEndTime().format(DT_FMT))
                        .append("\n");
            }
        }

        String prompt = buildPrompt(userName, userPhone, log, wage, workLog.toString());
        return callOpenAi(prompt);
    }

    private String buildPrompt(String userName, String userPhone,
                                AnalysisLog log,
                                WageCalculationService.WageCalculationResult wage,
                                String workLogText) {
        return String.format("""
                당신은 고용노동부 진정서 작성 전문가입니다.
                아래 정보를 바탕으로 고용노동부 공식 임금체불 진정서 초안을 작성해주세요.

                [신청인 정보]
                - 이름: %s
                - 연락처: %s

                [피진정인 사업장 정보]
                - 상호명: %s
                - 사업자등록번호: %s

                [피해 내용]
                - 체불 유형: %s
                - 체불 추정액: %,d원
                - 피해 상황 설명: %s

                [근무 기록 (앱 자동 기록)]
                %s

                [임금 산정 내역]
                - 시급: %,d원
                - 총 근무 시간: %.1f시간
                - 기본급: %,d원
                - 주휴수당: %,d원
                - 연장수당: %,d원
                - 야간수당: %,d원
                - 응당 받아야 할 총액: %,d원

                요청 형식:
                1. 진정의 취지 (명확하게 무엇을 요구하는지)
                2. 진정의 이유 (사실관계, 법적 근거 포함)
                3. 입증 자료 목록
                4. 요청 사항

                법령 근거는 근로기준법 조항을 명시해주세요.
                전문적이고 정확한 법적 문서 형식으로 작성해주세요.
                """,
                userName, userPhone,
                log.getBusinessName() != null ? log.getBusinessName() : "미상",
                log.getBusinessRegistrationNumber() != null ? log.getBusinessRegistrationNumber() : "미상",
                formatViolationType(log.getViolationType()),
                log.getUnpaidAmount() != null ? log.getUnpaidAmount() : 0L,
                log.getDescription() != null ? log.getDescription() : "",
                workLogText,
                wage.getHourlyWage(),
                wage.getTotalWorkMinutes() / 60.0,
                wage.getTotalBasePay(),
                wage.getTotalWeeklyHolidayPay(),
                wage.getTotalOvertimePay(),
                wage.getTotalNightPay(),
                wage.getTotalShouldReceive()
        );
    }

    private String callOpenAi(String prompt) {
        try {
            RestClient client = RestClient.create();
            String body = objectMapper.writeValueAsString(Map.of(
                    "model", openAiProperties.model(),
                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "max_tokens", 2000
            ));
            String response = client.post()
                    .uri(openAiProperties.baseUrl() + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiProperties.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode json = objectMapper.readTree(response);
            return json.path("choices").path(0).path("message").path("content").asText();
        } catch (Exception e) {
            log.error("[진정서 생성 실패] {}", e.getMessage());
            return buildFallbackDraft();
        }
    }

    private String buildFallbackDraft() {
        return """
                [임금체불 진정서 초안]

                진정의 취지:
                피진정인은 신청인에게 근로기준법에서 정한 임금을 지급할 것을 촉구합니다.

                진정의 이유:
                신청인은 피진정인 사업장에서 근무하였으나, 근로기준법 제43조에 따른 임금을
                지급받지 못하였습니다.

                요청 사항:
                고용노동부의 신속한 조사와 체불 임금 지급 명령을 요청합니다.

                ※ 진정서 제출: https://minwon.moel.go.kr
                """;
    }

    private String formatViolationType(String type) {
        if (type == null) return "임금체불";
        return switch (type) {
            case "MINIMUM_WAGE" -> "최저임금 위반";
            case "WEEKLY_HOLIDAY" -> "주휴수당 미지급";
            case "OVERTIME" -> "연장근로수당 미지급";
            case "NIGHT" -> "야간근로수당 미지급";
            default -> "임금체불";
        };
    }
}
