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

    public void init(String type, String severity, String description, String legalBasis) {
        this.type = type;
        this.severity = severity;
        this.description = description;
        this.legalBasis = legalBasis;
    }
}
