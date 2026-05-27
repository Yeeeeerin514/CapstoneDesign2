package com.albasave.albasave_server.contract.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ContractAnalysisResponse {
    private Long contractId;

    /** 위반 여부 */
    private boolean hasViolation;

    /** 계약서에서 추출한 정보 */
    private ExtractedContractInfo extractedInfo;

    /** 위반 항목 목록 */
    private List<ContractViolation> violations;

    /** 분석 요약 */
    private String summary;

    /** 최저시급 (비교용) */
    private int minimumWage;

    /** S3 이미지 URL */
    private String imageUrl;

    /** 진정서 작성용 정형 데이터 (사업자번호, 근로요일 enum, 근로시각 LocalTime, 입사일 LocalDate, 시급) */
    private ContractFactSheet factSheet;

    private LocalDateTime createdAt;
}
