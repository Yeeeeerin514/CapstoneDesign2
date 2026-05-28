package com.albasave.albasave_server.mentoring.dto;

import com.albasave.albasave_server.mentoring.domain.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/** 멘토 프로필 등록/수정 요청 바디. */
@Getter
@Setter
@NoArgsConstructor
public class MentorRegistrationRequest {
    private String nickname;
    private Industry industry;
    private List<DamageType> damageTypes;
    private EmploymentType employmentType;
    private BusinessSize businessSize;
    private Region region;
    private List<ResolutionMethod> resolutionMethods;
    private Integer resolutionDays;
    private DamageAmountRange damageAmountRange;
    private String bio;
    private Integer capacity;
    private Integer consultingFee;
}
