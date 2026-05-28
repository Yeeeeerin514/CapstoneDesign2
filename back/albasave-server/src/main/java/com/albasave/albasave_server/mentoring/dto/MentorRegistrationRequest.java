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

    // ─────────────────────────────────────────────────────────────────
    //  자격 검증 (필수 — 둘 중 하나는 반드시 충족)
    // ─────────────────────────────────────────────────────────────────

    /**
     * 검증 방식 — 필수.
     * RESOLVED_CASE → verifiedCaseIds 필수
     * EVIDENCE_UPLOAD → evidenceUrls 필수
     */
    private VerificationMethod verificationMethod;

    /** RESOLVED_CASE인 경우 해결된 신고 사건의 ID 목록 (프론트 reportStore.cases의 id). */
    private List<Long> verifiedCaseIds;

    /** EVIDENCE_UPLOAD인 경우 S3에 올린 증빙 자료 URL 목록. */
    private List<String> evidenceUrls;
}
