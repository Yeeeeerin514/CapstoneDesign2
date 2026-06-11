package com.albasave.albasave_server.report.domain;

import com.albasave.albasave_server.userinfo.domain.User;
import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 신고 사건(진정서) 도메인.
 *
 * 1단계 draft 생성 + evidence(피해유형/자유서술/피진정인/진정내용) 저장까지 보유.
 * 진정인(applicant) 본인 정보(주민번호·성명 등)는 정책상 절대 저장하지 않는다(컬럼도 없음).
 */
@Entity
@Table(name = "report")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 사건 소유자. 본인 소유 검증의 기준. draft 생성 시 인증 사용자로 고정. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private User owner;

    /** 신고 생성 경로 (검색 / 등록된 알바 / 수동 입력). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportSource source;

    /** 신고 시점 사업장 정보 스냅샷. */
    @Embedded
    private BusinessSnapshot business;

    /**
     * 연결된 알바(PartTimeJob). source=REGISTERED일 때만 채워진다.
     * ReportRepository.findAllByPartTimeJobId가 이 경로를 사용.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_time_job_id")
    private PartTimeJob partTimeJob;

    /** 사건 상태. 신규 draft는 PENDING. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReportStatus status;

    /** 현재 진행 단계. 신규 draft는 EVIDENCE_COLLECTION. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CaseStep currentStep;

    // ── evidence 단계 (PUT /evidence로 채움) ─────────────────────────

    /** 피해(체불) 유형 — 다중. */
    @ElementCollection
    @CollectionTable(
            name = "report_damage_types",
            joinColumns = @JoinColumn(name = "report_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "damage_type", length = 40)
    private Set<damageTypeCode> damageTypes = new LinkedHashSet<>();

    /** 자유 서술 (자연어 피해 상황). */
    @Column(name = "free_form_description", columnDefinition = "TEXT")
    private String freeFormDescription;

    /** 진정서 "2. 피진정인" 항목. */
    @Embedded
    private RespondentInfo respondent;

    /** 진정서 "3. 진정 내용" 항목. */
    @Embedded
    private ComplaintFacts facts;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * 신고 draft 생성 — "그릇"만 만든다.
     * partTimeJob은 REGISTERED 경로에서만 non-null.
     */
    public static Report createDraft(User owner,
                                     ReportSource source,
                                     BusinessSnapshot business,
                                     PartTimeJob partTimeJob) {
        Report report = new Report();
        report.owner = owner;
        report.source = source;
        report.business = business;
        report.partTimeJob = partTimeJob;
        report.status = ReportStatus.PENDING;
        report.currentStep = CaseStep.EVIDENCE_COLLECTION;
        return report;
    }

    /**
     * evidence 부분 저장 — 블록 단위 null 가드(멱등 & 부분 업데이트).
     * 전달된 블록만 덮어쓰고, null인 블록은 기존 값을 유지한다.
     */
    public void applyEvidence(Set<damageTypeCode> damageTypes,
                              String freeFormDescription,
                              RespondentInfo respondent,
                              ComplaintFacts facts) {
        if (damageTypes != null) {
            this.damageTypes.clear();
            this.damageTypes.addAll(damageTypes);
        }
        if (freeFormDescription != null) {
            this.freeFormDescription = freeFormDescription;
        }
        if (respondent != null) {
            this.respondent = respondent;
        }
        if (facts != null) {
            this.facts = facts;
        }
    }

    /** 본인 소유 사건인지 검증. */
    public boolean isOwnedBy(Long userId) {
        return owner != null && owner.getId().equals(userId);
    }

    /**
     * 신고 정보(피해 유형 + 상황 서술)가 채워졌으면 진행 단계를 '진정서 작성'으로 올린다.
     * 프론트는 입력 완료 시 로컬 단계만 올렸는데 서버 currentStep이 그대로라
     * 화면 재진입 시 1/4 단계로 회귀하던 문제의 서버측 수정.
     * 이미 더 뒤 단계면 아무것도 하지 않는다(역행 금지·멱등).
     */
    public void advanceToComplaintDraftIfEvidenceComplete() {
        boolean evidenceComplete = !damageTypes.isEmpty()
                && freeFormDescription != null
                && !freeFormDescription.isBlank();
        if (currentStep == CaseStep.EVIDENCE_COLLECTION && evidenceComplete) {
            this.currentStep = CaseStep.COMPLAINT_DRAFT;
        }
    }
}
