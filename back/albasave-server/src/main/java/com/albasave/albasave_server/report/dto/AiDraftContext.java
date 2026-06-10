package com.albasave.albasave_server.report.dto;

import lombok.Builder;

import java.util.List;

/**
 * AI 진정 내용 생성에 넣을 컨텍스트.
 *
 * 사용자가 제공한 사실 중 진정 내용 작성에 꼭 필요한 항목만 담는다.
 * 값이 없는 항목은 null로 두고, 프롬프트 단계에서 "(미입력)"으로 표시되어 AI가 추측하지 못하게 한다.
 */
@Builder
public record AiDraftContext(
        List<String> damageTypeLabels,   // 피해(체불) 유형
        String freeFormDescription,      // 자연어 상황 서술
        String businessName,             // 사업장명(피진정인)
        String employmentStartDate,      // 입사일
        Integer totalUnpaidWage,         // 체불 임금 총액
        String negotiationFact           // 사업주와의 협의 시도 정황(선택값 → 사실 서술). null이면 미입력.
) {
}
