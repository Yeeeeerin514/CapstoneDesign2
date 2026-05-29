import { create } from "zustand";
import {
  getAmountCalcReadiness,
  INITIAL_EVIDENCE,
  STEP_ORDER,
  type CaseStep,
  type EvidenceFile,
  type EvidenceState,
  type FileEvidenceKey,
  type InvestigationSubStatus,
  type ReportCase,
  type ReportStatus,
} from "@/entities/report";

// ──────────────────────────────────────
// 금액 계산 헬퍼 (Phase A — mock 고정값, Phase B에서 실제 파싱으로 교체)
// ──────────────────────────────────────
/**
 * 증거 변경 후 받아야 할 / 받은 / 미지급 금액을 재계산.
 *  - 받아야 할 금액: 계약서·근무기록 자동 수집 시 기존 값 또는 mock 1,560,000원
 *                  / 사용자 직접 입력 시 hourlyWage × workHours
 *  - 받은 금액:     통장 내역·급여명세서 있을 때 기존 값 또는 mock 260,000원
 *  - 미지급:        wageOwed - paidAmount (양쪽 다 있을 때만, max 0)
 */
function recalculateAmounts(
  c: ReportCase,
  e: EvidenceState,
): Pick<
  ReportCase,
  "calculatedWageOwed" | "calculatedPaidAmount" | "calculatedUnpaid"
> {
  // readiness 단순 참조 — 향후 분기 확장 여지를 위해 보관.
  void getAmountCalcReadiness(e);

  let wageOwed: number | null = null;
  if (e.contracts > 0 || e.workLogs > 0) {
    wageOwed = c.calculatedWageOwed ?? 1_560_000;
  } else if (
    e.userInputHourlyWage !== null &&
    e.userInputWorkHours !== null
  ) {
    wageOwed = e.userInputHourlyWage * e.userInputWorkHours;
  }

  let paidAmount: number | null = null;
  if (e.bankRecords > 0 || e.paystubs > 0) {
    paidAmount = c.calculatedPaidAmount ?? 260_000;
  }

  const unpaid =
    wageOwed !== null && paidAmount !== null
      ? Math.max(0, wageOwed - paidAmount)
      : null;

  return {
    calculatedWageOwed: wageOwed,
    calculatedPaidAmount: paidAmount,
    calculatedUnpaid: unpaid,
  };
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
    industry: string;
    region: string;
    damageTypes: string[];
    /** 자동 수집된 초기 증거 — 미지정 시 INITIAL_EVIDENCE 사용. */
    initialEvidence?: Partial<EvidenceState>;
  }) => string;

  /** 특정 step을 완료 처리. completedSteps 배열에 push + highestStep 업데이트. */
  completeStep: (caseId: string, stepId: CaseStep) => void;
  /** currentStep 변경. 이전 step은 모두 completedSteps에 push + highestStep 업데이트. */
  setCurrentStep: (caseId: string, stepId: CaseStep) => void;
  /** 현재 단계를 완료 처리하고 다음 step으로 진행. */
  advanceStep: (caseId: string) => void;
  /**
   * 완료된 이전 단계로 되돌아가기 (수정 모드).
   * highestStep은 절대 줄지 않으므로 "현재 진행 단계로 돌아가기"가 가능.
   */
  navigateToStep: (caseId: string, targetStep: CaseStep) => void;
  /** Step 2 수정 모드 진입 시 amountCalcState를 다시 'idle'로 리셋. */
  resetAmountCalcState: (caseId: string) => void;
  /** 사건 status 변경 — resolved로 전환 시 resolvedAt 자동 채움. */
  updateCaseStatus: (caseId: string, status: ReportStatus) => void;

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

  /** 노동청 제출 완료 시 submittedAt 기록 + investigationStatus를 'waiting_inspector'로 자동 설정. */
  setSubmittedAt: (caseId: string, submittedAt: string) => void;
  /** Step 6 (investigation) 내부 서브 상태 갱신. */
  updateInvestigationStatus: (
    caseId: string,
    status: InvestigationSubStatus,
  ) => void;

  /** 공동대응 그룹 참여 시 groupId 저장. */
  setGroupId: (caseId: string, groupId: string | undefined) => void;
  /** 공동대응 그룹 탈퇴 — groupId 제거. useGroupStore.leaveGroup과 함께 호출. */
  leaveGroup: (caseId: string) => void;
  /** 진정서 draftId 저장. */
  setDraftId: (caseId: string, draftId: string) => void;
  /** 후기 작성 완료 토글. ReviewWriteView가 작성 직후 호출. */
  setHasWrittenReview: (caseId: string, value: boolean) => void;

  /** Step 2 — "금액 계산 시작" 누름. amountCalcState='calculating'으로 전환. */
  startAmountCalc: (caseId: string) => void;
  /** Step 2 — 계산 완료. recalculateAmounts 실행 + amountCalcState='done'으로 전환. */
  finishAmountCalc: (caseId: string) => void;
  /** Step 2 — 사용자가 금액 확인. step 2 완료 처리 + step 3 (group_decision)으로 진행. */
  confirmAmountCalc: (caseId: string) => void;

  closeCase: (caseId: string) => void;
  deleteCase: (caseId: string) => void;
}

export const useReportStore = create<ReportStoreState>((set, get) => ({
  cases: [],
  shouldSkipNextFocusReset: false,
  setShouldSkipNextFocusReset: (value) =>
    set({ shouldSkipNextFocusReset: value }),

  startReport: ({
    workplaceName,
    businessRegistrationNumber = null,
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
      industry,
      region,
      damageTypes,
      status: "pending",
      currentStep: "evidence_collection",
      highestStep: "evidence_collection",
      completedSteps: [],
      evidence: { ...INITIAL_EVIDENCE, ...initialEvidence },
      evidenceFiles: [],
      calculatedWageOwed: null,
      calculatedPaidAmount: null,
      calculatedUnpaid: null,
      amountCalcState: "idle",
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

  resetAmountCalcState: (caseId) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, amountCalcState: "idle" } : c,
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
                status === "resolved"
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

  setSubmittedAt: (caseId, submittedAt) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId
          ? {
              ...c,
              submittedAt,
              investigationStatus:
                c.investigationStatus ?? "waiting_inspector",
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

  setGroupId: (caseId, groupId) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, groupId } : c,
      ),
    })),

  leaveGroup: (caseId) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, groupId: undefined } : c,
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

  startAmountCalc: (caseId) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, amountCalcState: "calculating" } : c,
      ),
    })),

  finishAmountCalc: (caseId) =>
    set((s) => ({
      cases: s.cases.map((c) => {
        if (c.id !== caseId) return c;
        const amounts = recalculateAmounts(c, c.evidence);
        return { ...c, ...amounts, amountCalcState: "done" };
      }),
    })),

  confirmAmountCalc: (caseId) => {
    // 1. amountCalcState='confirmed'로 마킹
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, amountCalcState: "confirmed" } : c,
      ),
    }));
    // 2. step 2 완료 처리 + step 3 (group_decision)으로 진행 — 기존 액션 재사용
    get().completeStep(caseId, "amount_calculation");
    get().setCurrentStep(caseId, "group_decision");
  },

  closeCase: (caseId) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, status: "unresolved" } : c,
      ),
    })),

  deleteCase: (caseId) =>
    set((s) => ({
      cases: s.cases.filter((c) => c.id !== caseId),
    })),
}));
