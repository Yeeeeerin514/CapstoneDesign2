import { create } from "zustand";
import {
  INITIAL_EVIDENCE,
  STEP_ORDER,
  type BusinessInfo,
  type CaseStep,
  type ComplaintFacts,
  type ComplaintRespondent,
  type DamageTypeEnum,
  type EvidenceFile,
  type EvidenceState,
  type FileEvidenceKey,
  type InvestigationSubStatus,
  type ReportCase,
  type ReportDraftSource,
  type ReportStatus,
  type WageBreakdown,
} from "@/entities/report";

/**
 * 미지급 금액 derive — 우선순위:
 *   1. manualUnpaidAmount (사용자가 breakdown 편집 후 저장한 값)
 *   2. wageBreakdown.totalShouldReceive - actualReceivedAmount (양쪽 다 있을 때)
 *   3. 기존 calculatedUnpaid 보존 (mock 흐름 호환)
 */
function deriveUnpaid(c: ReportCase): number | null {
  if (c.manualUnpaidAmount !== null) return c.manualUnpaidAmount;
  if (c.wageBreakdown !== null && c.actualReceivedAmount !== null) {
    return Math.max(
      0,
      c.wageBreakdown.totalShouldReceive - c.actualReceivedAmount,
    );
  }
  return c.calculatedUnpaid;
}

interface ReportStoreState {
  cases: ReportCase[];

  /**
   * 일회성 플래그 — ReportView의 useFocusEffect가 다음 focus 이벤트에서 list 리셋을 건너뜀.
   * 사용 예: mentor-chat 같은 top-level 라우트로 잠시 빠져나갔다가 돌아올 때
   * 사건 상세(detail) 상태를 보존하기 위해 router.push 전에 true로 설정.
   */
  shouldSkipNextFocusReset: boolean;
  setShouldSkipNextFocusReset: (value: boolean) => void;

  /**
   * 신고 시작 — 사용자가 직접 입력한 금액은 받지 않음.
   * 증거(계약서/근무기록)는 앱이 자동 수집한 건수를 그대로 반영.
   */
  startReport: (params: {
    workplaceName: string;
    businessRegistrationNumber?: string | null;
    /** 백엔드 business 테이블 ID. 사업장 검색 연결 시. */
    businessId?: number | null;
    industry: string;
    region: string;
    damageTypes: string[];
    initialEvidence?: Partial<EvidenceState>;
  }) => string;

  /** step 완료 처리 + highestStep 업데이트. */
  completeStep: (caseId: string, stepId: CaseStep) => void;
  /** currentStep 설정. completedSteps도 함께 갱신. */
  setCurrentStep: (caseId: string, stepId: CaseStep) => void;
  /** 다음 step으로 진행. */
  advanceStep: (caseId: string) => void;
  /**
   * 완료된 이전 단계로 되돌아가기 (수정 모드).
   * highestStep은 절대 줄지 않으므로 "현재 진행 단계로 돌아가기"가 가능.
   */
  navigateToStep: (caseId: string, targetStep: CaseStep) => void;
  /** 사건 status 변경 — resolved로 전환 시 resolvedAt 자동 채움. */
  updateCaseStatus: (caseId: string, status: ReportStatus) => void;
  /** 노동청 제출 완료 — submittedAt + investigationStatus 자동 설정. */
  setSubmittedAt: (caseId: string, submittedAt: string) => void;
  /** Step 6 (investigation) 내부 서브 상태 갱신. */
  updateInvestigationStatus: (
    caseId: string,
    status: InvestigationSubStatus,
  ) => void;

  /** 증거 상태 부분 갱신 — 한 필드씩 + 또는 통째 set. 금액 재계산은 별도. */
  updateEvidence: (caseId: string, patch: Partial<EvidenceState>) => void;
  /**
   * 증거 한 종류를 count만큼 증가 + 금액 자동 재계산.
   * EvidenceTodoBox의 "🏦 통장 내역 추가하기" 등 단일 추가 액션에 사용.
   * userInput* 필드(시급/근무시간)는 숫자 합산이 의미 없으므로 setManualWageInput 사용.
   */
  addEvidence: (
    caseId: string,
    type: Exclude<
      keyof EvidenceState,
      "userInputHourlyWage" | "userInputWorkHours"
    >,
    count?: number,
  ) => void;
  /** 사용자가 직접 입력한 시급·근무시간 저장 + 금액 자동 재계산. */
  setManualWageInput: (
    caseId: string,
    hourlyWage: number,
    workHours: number,
  ) => void;

  /**
   * 증거 파일 여러 건 추가 + evidence 카운트 자동 동기화.
   * 갤러리 다중 선택 / 카메라 1장 / 문서 선택 모두 이 단일 액션을 사용.
   * 금액 계산은 Step 2 finishAmountCalc에서만 일어남 — 여기선 절대 금액 갱신 안 함.
   */
  addEvidenceFiles: (caseId: string, files: EvidenceFile[]) => void;
  /** 단일 파일 삭제 + evidence 카운트 -1. */
  removeEvidenceFile: (caseId: string, fileId: string) => void;
  /** 특정 종류의 파일만 조회 (UI 셀렉터용). */
  getEvidenceFilesByType: (
    caseId: string,
    type: FileEvidenceKey,
  ) => EvidenceFile[];

  /** Step 1 — 자연어 증거 텍스트 추가 (말미). */
  addEvidenceText: (caseId: string, text: string) => void;
  /** index 기반 삭제 — 카드에서 ✕ 누름. */
  removeEvidenceText: (caseId: string, index: number) => void;

  /** 진정서 draftId 저장. */
  setDraftId: (caseId: string, draftId: string) => void;
  /** 후기 작성 완료 토글. ReviewWriteView가 작성 직후 호출. */
  setHasWrittenReview: (caseId: string, value: boolean) => void;

  /** Step 2 — 백엔드 wage-calc 결과 캐싱. */
  setWageBreakdown: (caseId: string, breakdown: WageBreakdown | null) => void;
  /** 사용자 지정 시급 입력 (wage-calc 재호출용). */
  setReportHourlyWage: (caseId: string, hourlyWage: number | null) => void;
  /** 실제 수령액 입력 — 미지급 추정액 derive 즉시 갱신. */
  setActualReceivedAmount: (caseId: string, amount: number | null) => void;
  /** 수동 미지급 총액 (편집 폼 결과) — derive 우선순위 최상위. */
  setManualUnpaidAmount: (caseId: string, amount: number | null) => void;

  closeCase: (caseId: string) => void;
  deleteCase: (caseId: string) => void;

  // ──────────────────────────────────────
  // V2 — 신규 흐름 (백엔드 통신 문서 2026-05-30)
  // ──────────────────────────────────────

  /**
   * POST /reports/draft 응답을 사건 store에 추가.
   * V1 startReport와 달리 백엔드 caseId/business를 그대로 보존.
   * source가 "registered"인 경우 partTimeJobId도 함께 전달.
   */
  createReportDraft: (params: {
    caseId: string;
    source: ReportDraftSource;
    business: BusinessInfo;
    partTimeJobId?: number;
    industry?: string;
    region?: string;
  }) => void;

  /** 1단계 1-A 다중 선택 결과 저장. */
  setDamageTypes: (caseId: string, types: DamageTypeEnum[]) => void;
  /** 1단계 1-B 자유 서술 저장. */
  setFreeFormDescription: (caseId: string, text: string) => void;
  /** 1단계 1-C 피진정인 폼 저장 (부분 patch 허용). */
  patchRespondent: (
    caseId: string,
    patch: Partial<ComplaintRespondent>,
  ) => void;
  /** 1단계 1-C 진정 내용 폼 저장 (부분 patch 허용). */
  patchFacts: (caseId: string, patch: Partial<ComplaintFacts>) => void;
}

export const useReportStore = create<ReportStoreState>((set, get) => ({
  cases: [],
  shouldSkipNextFocusReset: false,
  setShouldSkipNextFocusReset: (value) =>
    set({ shouldSkipNextFocusReset: value }),

  startReport: ({
    workplaceName,
    businessRegistrationNumber = null,
    businessId = null,
    industry,
    region,
    damageTypes,
    initialEvidence,
  }) => {
    const id = `report-${Date.now()}`;
    const newCase: ReportCase = {
      id,
      workplaceName,
      businessRegistrationNumber,
      businessId,
      industry,
      region,
      damageTypes,
      status: "PENDING",
      currentStep: "evidence_collection",
      highestStep: "evidence_collection",
      completedSteps: [],
      evidence: { ...INITIAL_EVIDENCE, ...initialEvidence },
      evidenceFiles: [],
      evidenceTexts: [],
      calculatedWageOwed: null,
      calculatedPaidAmount: null,
      calculatedUnpaid: null,
      wageBreakdown: null,
      hourlyWage: null,
      actualReceivedAmount: null,
      manualUnpaidAmount: null,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ cases: [newCase, ...s.cases] }));
    return id;
  },

  completeStep: (caseId, stepId) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const stepIdx = STEP_ORDER.indexOf(stepId);
        const highestIdx = STEP_ORDER.indexOf(c.highestStep);
        return {
          ...c,
          completedSteps: c.completedSteps.includes(stepId)
            ? c.completedSteps
            : [...c.completedSteps, stepId],
          highestStep: stepIdx > highestIdx ? stepId : c.highestStep,
        };
      }),
    })),

  setCurrentStep: (caseId, stepId) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const nextIdx = STEP_ORDER.indexOf(stepId);
        if (nextIdx === -1) return c;
        const completed = STEP_ORDER.slice(0, nextIdx);
        const merged = Array.from(
          new Set([...c.completedSteps, ...completed]),
        );
        const highestIdx = STEP_ORDER.indexOf(c.highestStep);
        return {
          ...c,
          currentStep: stepId,
          completedSteps: merged,
          // 앞으로 진행한 경우에만 highestStep 갱신. 수정 모드 이동(뒤로)은 유지.
          highestStep: nextIdx > highestIdx ? stepId : c.highestStep,
        };
      }),
    })),

  advanceStep: (caseId) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const curIdx = STEP_ORDER.indexOf(c.currentStep);
        const nextIdx = Math.min(curIdx + 1, STEP_ORDER.length - 1);
        const prevStepId = STEP_ORDER[curIdx];
        const nextStepId = STEP_ORDER[nextIdx];
        const highestIdx = STEP_ORDER.indexOf(c.highestStep);
        return {
          ...c,
          currentStep: nextStepId,
          completedSteps: c.completedSteps.includes(prevStepId)
            ? c.completedSteps
            : [...c.completedSteps, prevStepId],
          highestStep: nextIdx > highestIdx ? nextStepId : c.highestStep,
        };
      }),
    })),

  navigateToStep: (caseId, targetStep) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, currentStep: targetStep } : c,
      ),
    })),

  updateCaseStatus: (caseId, status) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status,
              resolvedAt:
                status === "RESOLVED"
                  ? new Date().toISOString()
                  : c.resolvedAt,
            }
          : c,
      ),
    })),

  updateEvidence: (caseId, patch) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, evidence: { ...c.evidence, ...patch } } : c,
      ),
    })),

  addEvidence: (caseId, type, count = 1) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const newEvidence: EvidenceState = {
          ...c.evidence,
          [type]: c.evidence[type] + count,
        };
        // 증거 추가만 — 금액은 Step 2에서 사용자가 [금액 계산 시작] 누를 때만 finishAmountCalc로 계산.
        return { ...c, evidence: newEvidence };
      }),
    })),

  setManualWageInput: (caseId, hourlyWage, workHours) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const newEvidence: EvidenceState = {
          ...c.evidence,
          userInputHourlyWage: hourlyWage,
          userInputWorkHours: workHours,
        };
        // 시급/근무시간 입력만 — 금액 계산은 Step 2 finishAmountCalc에 위임.
        return { ...c, evidence: newEvidence };
      }),
    })),

  addEvidenceFiles: (caseId, files) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        // evidence 카운트를 파일 종류별로 +1씩 누적.
        const newEvidence: EvidenceState = { ...c.evidence };
        files.forEach((f) => {
          const key = f.evidenceType;
          newEvidence[key] = (newEvidence[key] as number) + 1;
        });
        return {
          ...c,
          evidenceFiles: [...c.evidenceFiles, ...files],
          evidence: newEvidence,
          // 금액은 자동 계산 안 함 — Step 2 finishAmountCalc만 트리거.
        };
      }),
    })),

  removeEvidenceFile: (caseId, fileId) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const target = c.evidenceFiles.find((f) => f.id === fileId);
        if (target === undefined) return c;
        const newEvidence: EvidenceState = { ...c.evidence };
        const key = target.evidenceType;
        newEvidence[key] = Math.max(0, (newEvidence[key] as number) - 1);
        return {
          ...c,
          evidenceFiles: c.evidenceFiles.filter((f) => f.id !== fileId),
          evidence: newEvidence,
        };
      }),
    })),

  getEvidenceFilesByType: (caseId, type) => {
    const c = get().cases.find((c) => c.id === caseId);
    return c?.evidenceFiles.filter((f) => f.evidenceType === type) ?? [];
  },

  addEvidenceText: (caseId, text) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId
          ? { ...c, evidenceTexts: [...c.evidenceTexts, text] }
          : c,
      ),
    })),

  removeEvidenceText: (caseId, index) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId
          ? {
              ...c,
              evidenceTexts: c.evidenceTexts.filter((_, i) => i !== index),
            }
          : c,
      ),
    })),

  setDraftId: (caseId, draftId) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, draftId } : c,
      ),
    })),

  setHasWrittenReview: (caseId, value) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, hasWrittenReview: value } : c,
      ),
    })),

  setWageBreakdown: (caseId, breakdown) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const updated = { ...c, wageBreakdown: breakdown };
        return { ...updated, calculatedUnpaid: deriveUnpaid(updated) };
      }),
    })),

  setReportHourlyWage: (caseId, hourlyWage) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, hourlyWage } : c,
      ),
    })),

  setActualReceivedAmount: (caseId, amount) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const updated = { ...c, actualReceivedAmount: amount };
        return { ...updated, calculatedUnpaid: deriveUnpaid(updated) };
      }),
    })),

  setManualUnpaidAmount: (caseId, amount) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const updated = { ...c, manualUnpaidAmount: amount };
        return { ...updated, calculatedUnpaid: deriveUnpaid(updated) };
      }),
    })),

  setSubmittedAt: (caseId, submittedAt) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId
          ? {
              ...c,
              submittedAt,
              investigationStatus: "waiting_inspector",
            }
          : c,
      ),
    })),

  updateInvestigationStatus: (caseId, status) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, investigationStatus: status } : c,
      ),
    })),

  closeCase: (caseId) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, status: "UNRESOLVED" } : c,
      ),
    })),

  createReportDraft: ({
    caseId,
    source,
    business,
    partTimeJobId,
    industry,
    region,
  }) =>
    set((s) => {
      // 이미 같은 id가 있으면 (재진입 등) 덮어쓰기 대신 무시.
      if (s.cases.some((c) => c.id === caseId)) return s;
      const newCase: ReportCase = {
        id: caseId,
        workplaceName: business.name,
        businessRegistrationNumber: business.registrationNumber,
        businessId: null,
        industry: industry ?? business.category ?? "",
        region: region ?? "",
        damageTypes: [],
        status: "PENDING",
        currentStep: "evidence_collection",
        highestStep: "evidence_collection",
        completedSteps: [],
        evidence: { ...INITIAL_EVIDENCE },
        evidenceFiles: [],
        evidenceTexts: [],
        calculatedWageOwed: null,
        calculatedPaidAmount: null,
        calculatedUnpaid: null,
        wageBreakdown: null,
        hourlyWage: null,
        actualReceivedAmount: null,
        manualUnpaidAmount: null,
        createdAt: new Date().toISOString(),
        // V2 신규 필드
        business,
        draftSource: source,
        damageTypeEnums: [],
        freeFormDescription: "",
        respondent: {
          representativeName: business.representativeName,
          phone: business.phone,
          address: business.address,
          businessType: "WORKPLACE",
          workplaceName: business.name,
          workplacePhone: business.phone,
          employeeCount: null,
        },
        facts: {
          employmentStartDate: null,
          employmentEndDate: null,
          totalUnpaidWage: null,
          employmentStatus: null,
          unpaidSeverance: null,
          otherUnpaid: null,
          jobDescription: null,
          wagePaymentDate: null,
          contractMethod: null,
        },
      };
      // partTimeJobId가 있으면 store의 별도 매핑 등에 활용 가능 (현재는 보존만).
      void partTimeJobId;
      return { cases: [newCase, ...s.cases] };
    }),

  setDamageTypes: (caseId, types) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, damageTypeEnums: types } : c,
      ),
    })),

  setFreeFormDescription: (caseId, text) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, freeFormDescription: text } : c,
      ),
    })),

  patchRespondent: (caseId, patch) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const cur: ComplaintRespondent = c.respondent ?? {
          representativeName: null,
          phone: null,
          address: null,
          businessType: "WORKPLACE",
          workplaceName: c.workplaceName,
          workplacePhone: null,
          employeeCount: null,
        };
        return { ...c, respondent: { ...cur, ...patch } };
      }),
    })),

  patchFacts: (caseId, patch) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const cur: ComplaintFacts = c.facts ?? {
          employmentStartDate: null,
          employmentEndDate: null,
          totalUnpaidWage: null,
          employmentStatus: null,
          unpaidSeverance: null,
          otherUnpaid: null,
          jobDescription: null,
          wagePaymentDate: null,
          contractMethod: null,
        };
        return { ...c, facts: { ...cur, ...patch } };
      }),
    })),

  deleteCase: (caseId) =>
    set((s) => ({
      cases: s.cases.filter((c) => c.id !== caseId),
    })),
}));
