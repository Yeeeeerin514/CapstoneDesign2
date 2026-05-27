package com.albasave.albasave_server.contract.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ContractViolation {
    private String type;
    private String severity;
    private String description;
    private String legalBasis;
    /** 법제처 API에서 받은 해당 조문 본문 (RAG 컨텍스트). null 가능. */
    private String legalBasisExcerpt;

    public void init(String type, String severity, String description, String legalBasis) {
        this.type = type;
        this.severity = severity;
        this.description = description;
        this.legalBasis = legalBasis;
    }
}
