package com.albasave.albasave_server.mentoring.domain;

import com.albasave.albasave_server.mentoring.domain.converter.DamageTypeListConverter;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "mentee_match_request",
        indexes = {
                @Index(name = "ix_mentee_request_user", columnList = "mentee_user_id"),
                @Index(name = "ix_mentee_request_case", columnList = "case_id")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenteeMatchRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mentee_user_id", nullable = false)
    private Long menteeUserId;

    @Column(name = "case_id")
    private Long caseId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Industry industry;

    @Convert(converter = DamageTypeListConverter.class)
    @Column(name = "damage_types", length = 300)
    @Builder.Default
    private List<DamageType> damageTypes = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", length = 30)
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_size", length = 20)
    private BusinessSize businessSize;

    @Enumerated(EnumType.STRING)
    private Region region;

    @Enumerated(EnumType.STRING)
    @Column(name = "damage_amount_range", length = 20)
    private DamageAmountRange damageAmountRange;

    /** 멘티 사건 자유 서술 (Phase 2 임베딩 매칭) */
    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
