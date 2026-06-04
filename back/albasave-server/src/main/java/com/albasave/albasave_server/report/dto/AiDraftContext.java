package com.albasave.albasave_server.report.dto;

import lombok.Builder;

import java.util.List;

/**
 * AI 진정 내용 생성에 넣을 컨텍스트.
 *
 * 사용자가 제공/저장한 사실만 담는다(자유 서술 + 피해 유형 + 진정 내용 폼 + 사업장 스냅샷 + 등록 알바).
 * 값이 없는 항목은 null로 두고, 프롬프트 단계에서 "(미입력)"으로 표시되어 AI가 추측하지 못하게 한다.
 */
@Builder
public record AiDraftContext(
        // ── 피해 유형 + 자연어 서술 (프론트 직접 입력) ──
        List<String> damageTypeLabels,
        String freeFormDescription,

        // ── 근로 관계 (Report/PartTimeJob에서) ──
        String businessName,
        String businessAddress,
        String employmentStartDate,
        String employmentEndDate,
        String employmentStatusLabel,   // 재직 중 / 퇴직
        String workSchedule,            // 예: "월,수,금 09:00~18:00"
        String jobDescription,
        Integer hourlyWage,
        String contractMethodLabel,     // 서면 / 구두

        // ── 체불 현황 (진정 내용 폼에서) ──
        Integer totalUnpaidWage,
        Integer unpaidSeverance,
        Integer otherUnpaid,
        String wagePaymentDate
) {
}
