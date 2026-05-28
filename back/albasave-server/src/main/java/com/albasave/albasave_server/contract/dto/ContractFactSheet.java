package com.albasave.albasave_server.contract.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 진정서 작성에 활용할 정형 데이터.
 *
 * <h3>팀원 안내</h3>
 * <pre>
 * GET /api/contracts/{contractId}
 *   → ContractAnalysisResponse.factSheet 에 이 record가 들어 있음
 * </pre>
 *
 * <h3>필드 가이드</h3>
 * <ul>
 *   <li>모든 필드는 추출 실패 시 null 가능 — 진정서 화면에서 값 없으면 "확인불가" 표시 권장.</li>
 *   <li>workDays는 Java {@link DayOfWeek} enum 리스트. 정렬은 보장하지 않음.</li>
 *   <li>LocalTime/LocalDate는 ISO 직렬화 ("HH:mm", "yyyy-MM-dd").</li>
 *   <li>wagePaymentDate는 OCR 원문 그대로 ("매월 5일", "매월 말일" 등) — 진정서에 그대로 인용 가능.</li>
 * </ul>
 */
public record ContractFactSheet(

        // ── 핵심 5종 (팀원 최초 요청) ─────────────────────────────────
        String businessRegistrationNumber,
        List<DayOfWeek> workDays,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm") LocalTime workStartTime,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm") LocalTime workEndTime,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd") LocalDate employmentStartDate,
        Integer hourlyWage,
        int minimumWage,

        // ── 진정서 보강 (이번 작업으로 추가) ──────────────────────────
        Integer monthlyWage,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd") LocalDate employmentEndDate,
        /** 임금 지급일 원문 (예: "매월 5일", "매월 말일") — 체불 시점 계산에 사용 */
        String wagePaymentDate,
        String wagePaymentMethod,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm") LocalTime breakStartTime,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm") LocalTime breakEndTime,
        /** 피진정인(사업장) 상호 */
        String employerName,
        /** 피진정인 주소 — 관할 노동청 결정에 사용 */
        String employerAddress,
        String employerPhone,
        /** 피진정인 대표자 성명 */
        String employerRepresentative
) {
}
