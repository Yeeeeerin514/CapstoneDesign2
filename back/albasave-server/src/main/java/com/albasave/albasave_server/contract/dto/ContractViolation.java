package com.albasave.albasave_server.contract.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ContractViolation {
    private String type;
    private String severity;
    private String description;
    private String legalBasis;
    /** 법제처 API에서 받은 해당 조문 본문 (Level 1 RAG 컨텍스트). null 가능. */
    private String legalBasisExcerpt;

    /** 위반과 관련된 판례·해석례 발췌 (Level 3 RAG). 0~3건. */
    private List<RelatedCase> relatedCases;

    public void init(String type, String severity, String description, String legalBasis) {
        this.type = type;
        this.severity = severity;
        this.description = description;
        this.legalBasis = legalBasis;
    }

    /** 위반과 함께 노출되는 판례·해석례 1건 */
    public record RelatedCase(
            String sourceType,   // "PRECEDENT" | "INTERPRETATION"
            String header,       // 사용자 표시용 헤더
            String excerpt       // 발췌 본문 (최대 400자)
    ) {}
}
