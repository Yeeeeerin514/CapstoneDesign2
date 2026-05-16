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

    private LocalDateTime createdAt;
}
