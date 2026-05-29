package com.albasave.albasave_server.mentoring.dto;

import com.albasave.albasave_server.mentoring.domain.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/** 멘티 매칭 요청 바디. */
@Getter
@Setter
@NoArgsConstructor
public class MatchRequestPayload {
    private Long caseId;
    private Industry industry;
    private List<DamageType> damageTypes;
    private EmploymentType employmentType;
    private BusinessSize businessSize;
    private Region region;
    private DamageAmountRange damageAmountRange;
    private String description;
    private Integer topK; // default 3
}
