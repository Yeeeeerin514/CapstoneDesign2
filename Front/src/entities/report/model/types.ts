export type EvidenceType =
  | "bssid-log"
  | "contract"
  | "bankbook"
  | "payslip"
  | "etc";

export interface ReportEvidence {
  id: string;
  type: EvidenceType;
  /** 로컬 URI 또는 서버 URL. */
  uri: string;
  /** 사용자에게 보여줄 라벨 (예: "1월 BSSID 기록"). */
  label: string;
  /** 자동 수집 여부 — UI에서 ✓ 표시. */
  autoCollected: boolean;
}

/**
 * 레거시 신고 모델 — `entities/report/api/create-report.ts`가 사용.
 * 새 신고 코치 흐름은 `ReportCase`를 사용한다.
 */
export interface Report {
  id: string;
  workplaceId: string;
  workplaceName: string;
  estimatedUnpaidAmount: number;
  status: "draft" | "submitted" | "resolved";
  evidences: ReportEvidence[];
  /** 연대 신고 여부. */
  isSolidarity: boolean;
  /** 연대 참여자 수 (본인 포함). */
  participantCount: number;
  /** ISO 생성 시각. */
  createdAt: string;
}

// ───────────────────────────────────────────────
// 신고 코치 흐름 — ReportCase 기반
// ───────────────────────────────────────────────

/**
 * 사건 상태 (앱 전체 통일) — docs/REPORT_SPEC.md 5-val 모델 기준.
 * - pending: 진정 접수 전 (증거수집/금액계산 단계)
 * - inspecting: 진정 제출 후 감독관 조사 중
 * - correction_ordered: 시정지시 완료
 * - resolved: 해결됨 (종결 통보 + 자가확인)
 * - unresolved: 미수령 (민사 필요)
 */
export type ReportStatus =
  | "PENDING"
  | "INSPECTING"
  | "CORRECTION_ORDERED"
  | "RESOLVED"
  | "UNRESOLVED";

/**
 * 6단계 정의 (공동대응이 3번째에 위치).
 * 1: evidence_collection, 2: amount_calculation, 3: group_decision,
 * 4: complaint_draft (멘토 주 진입점),
 * 5: submission, 6: investigation (멘토 보조 진입점)
 */
export type CaseStep =
  | "evidence_collection"
  | "amount_calculation"
  | "group_decision"
  | "complaint_draft"
  | "submission"
  | "investigation";

/**
 * Step 6 (investigation) 내부 4단계 서브 상태.
 * - waiting_inspector: 근로감독관 배정 대기 (제출 직후)
 * - awaiting_hearing: 출석요구서 수신, 출석조사 대기
 * - under_correction: 조사 완료 → 시정지시 발부 → 사업주 지급 대기
 * - resolved_confirm: 지급 확인 단계 (사용자 자가확인 트리거)
 */
export type InvestigationSubStatus =
  | "waiting_inspector"
  | "awaiting_hearing"
  | "under_correction"
  | "resolved_confirm";

/**
 * Step 2 (amount_calculation) 내부 4단계 서브 상태.
 * - idle: 계산 시작 전 (헤더 금액 숨김, "금액 계산 시작" 버튼만 노출)
 * - calculating: 계산 중 (로딩)
 * - done: 계산 완료 → 사용자 확인 대기 (금액 표시 + "이 금액이 맞나요?" 확인 버튼)
 * - confirmed: 사용자 확인 완료 → 다음 단계 진행 (이후엔 일반 ready 상태로 표시)
 */
export type AmountCalcState =
  | "idle"
  | "calculating"
  | "done"
  | "confirmed";

export const STEP_ORDER: readonly CaseStep[] = [
  "evidence_collection",
  "amount_calculation",
  "group_decision",
  "complaint_draft",
  "submission",
  "investigation",
] as const;

export interface CaseStepMeta {
  label: string;
  description: string;
  hasMentorEntry: boolean;
  mentorMessage?: string;
}

export const STEP_META: Record<CaseStep, CaseStepMeta> = {
  evidence_collection: {
    label: "증거 수집",
    description: "근무기록과 계약서가 자동 수집되었습니다",
    hasMentorEntry: false,
  },
  amount_calculation: {
    label: "미지급 금액 계산",
    description: "근무시간과 시급을 계산해 미지급금을 산정합니다",
    hasMentorEntry: false,
  },
  group_decision: {
    label: "공동대응 여부 결정",
    description: "같은 업장 피해자와 함께 신고하면 더 강한 압박이 됩니다",
    hasMentorEntry: false,
  },
  complaint_draft: {
    label: "진정서 작성",
    description: "AI가 고용노동부 양식에 맞춰 초안을 생성합니다",
    hasMentorEntry: true,
    mentorMessage:
      "진정서 작성이 막막하다면? 같은 경험을 가진 멘토와 매칭하세요",
  },
  submission: {
    label: "노동청 제출",
    description: "고용24 또는 지역 고용노동청에 직접 제출합니다",
    hasMentorEntry: false,
  },
  investigation: {
    label: "조사 및 해결",
    description: "근로감독관 출석조사 → 시정지시 → 해결",
    hasMentorEntry: true,
    mentorMessage: "출석조사가 처음이라 떨리시나요? 멘토와 준비하세요",
  },
};

/**
 * 상태 배지 — label · bg · 텍스트 color (hex). API-REFERENCE.md 기준.
 */
export const STATUS_BADGE: Record<
  ReportStatus,
  { label: string; bg: string; color: string }
> = {
  PENDING:            { label: "접수 대기", bg: "#F1F5F9", color: "#475569" }, // 회색
  INSPECTING:         { label: "조사 중",   bg: "#E8F2FF", color: "#1B64DA" }, // 파랑
  CORRECTION_ORDERED: { label: "시정 명령", bg: "#FEF3C7", color: "#92400E" }, // 주황
  RESOLVED:           { label: "해결 완료", bg: "#DCFCE7", color: "#15803D" }, // 초록
  UNRESOLVED:         { label: "미해결",    bg: "#FEE2E2", color: "#991B1B" }, // 빨강
};

/** 사건 status에서 현재 활성 step 도출. */
export function getCurrentStep(status: ReportStatus): CaseStep {
  switch (status) {
    case "PENDING":
      return "evidence_collection";
    case "INSPECTING":
      return "complaint_draft";
    case "CORRECTION_ORDERED":
    case "RESOLVED":
    case "UNRESOLVED":
      return "investigation";
  }
}

/** step 기반 진행률(%). */
export function getStepProgress(step: CaseStep): number {
  const idx = STEP_ORDER.indexOf(step);
  return Math.round(((idx + 1) / STEP_ORDER.length) * 100);
}

export type ReportStepStatus = "completed" | "in-progress" | "pending";

/** 레거시 ReportStep — UI에서 STEP_ORDER/STEP_META + completedSteps/currentStep으로 직접 도출 권장. */
export interface ReportStep {
  id: CaseStep;
  title: string;
  description: string;
  status: ReportStepStatus;
  actionLabel?: string;
  completedAt?: string;
}

/**
 * 증거 상태 — 미지급금 계산은 두 축이 필요:
 *   1) 받아야 할 금액 (시급 × 근무시간) ← contracts / workLogs / userInputHourlyWage / userInputWorkHours
 *   2) 실제 받은 금액                  ← bankRecords / paystubs
 * chatLogs / photos는 보조 증거 (계산엔 안 쓰이지만 진정서·조사 단계에서 도움).
 */
export interface EvidenceState {
  // [받아야 할 금액 계산용]
  /** 근로계약서 (시급 확인). */
  contracts: number;
  /** 출퇴근 기록 (근무시간 확인). */
  workLogs: number;
  /** 사용자가 직접 입력한 시급. 미입력 시 null. */
  userInputHourlyWage: number | null;
  /** 사용자가 직접 입력한 총 근무시간(시간 단위). 미입력 시 null. */
  userInputWorkHours: number | null;

  // [실제 받은 금액 확인용]
  /** 통장 입금 내역 (가장 핵심 증거). */
  bankRecords: number;
  /** 급여명세서. */
  paystubs: number;

  // [보조 증거]
  /** 사장님과의 대화 기록. */
  chatLogs: number;
  /** 현장 사진. */
  photos: number;
}

/** 모든 ReportCase 생성 시 사용하는 빈 증거 초기값. */
export const INITIAL_EVIDENCE: EvidenceState = {
  contracts: 0,
  workLogs: 0,
  userInputHourlyWage: null,
  userInputWorkHours: null,
  bankRecords: 0,
  paystubs: 0,
  chatLogs: 0,
  photos: 0,
};

// ──────────────────────────────────────
// 증거 파일 1건 + 증거 종류별 메타정보 (UI 라벨/아이콘/설명/파일 수용 타입)
// ──────────────────────────────────────

export type EvidenceFileType = "image" | "pdf" | "document";

export interface EvidenceFile {
  id: string;
  /** 어떤 EvidenceState 카운트 키에 속하는지. userInput* 키는 파일이 없음. */
  evidenceType: Exclude<
    keyof EvidenceState,
    "userInputHourlyWage" | "userInputWorkHours"
  >;
  /** 로컬 파일 경로 (Phase A: 기기 로컬, Phase B: 서버 업로드). */
  uri: string;
  name: string;
  fileType: EvidenceFileType;
  /** ISO date string. */
  addedAt: string;
  /** 앱 자동 수집 여부 (출퇴근 기록 / 계약서 자동 분석 등). */
  isAutoCollected: boolean;
  /** image 타입일 때 썸네일 URI (= uri 동일 가능). */
  thumbnail?: string;
}

/**
 * 파일 선택 UI에서 어떤 타입을 받을지.
 *  - imageOnly:   사진만 (카메라 + 갤러리)
 *  - imageAndPdf: 사진 + PDF
 *  - imageAndDoc: 사진 + 모든 문서 (xlsx, doc 등)
 */
export type EvidenceAcceptType =
  | "imageOnly"
  | "imageAndPdf"
  | "imageAndDoc";

export interface EvidenceMeta {
  key: keyof EvidenceState;
  label: string;
  icon: string;
  description: string;
  acceptTypes: EvidenceAcceptType;
  importance: "high" | "medium" | "low";
  /** 앱이 자동 수집 가능한 타입인지 (출퇴근 기록 / BSSID로 검출된 계약서 등). */
  isAutoCollected: boolean;
}

export const EVIDENCE_META: Record<keyof EvidenceState, EvidenceMeta> = {
  contracts: {
    key: "contracts",
    label: "근로계약서",
    icon: "📋",
    description: "근로계약서 사진을 찍거나 파일을 첨부하세요",
    acceptTypes: "imageAndPdf",
    importance: "high",
    isAutoCollected: true,
  },
  workLogs: {
    key: "workLogs",
    label: "근무 기록",
    icon: "🕐",
    description: "출퇴근 기록, 근무 스케줄 캡처 등",
    acceptTypes: "imageOnly",
    importance: "high",
    isAutoCollected: true,
  },
  bankRecords: {
    key: "bankRecords",
    label: "통장 내역",
    icon: "🏦",
    description: "급여 입금 내역이 보이는 통장 사진",
    acceptTypes: "imageAndPdf",
    importance: "high",
    isAutoCollected: false,
  },
  paystubs: {
    key: "paystubs",
    label: "급여명세서",
    icon: "💰",
    description: "급여명세서 사진 또는 파일",
    acceptTypes: "imageAndPdf",
    importance: "high",
    isAutoCollected: false,
  },
  chatLogs: {
    key: "chatLogs",
    label: "대화 기록",
    icon: "💬",
    description: "사장님과 임금 관련 대화 스크린샷 (카카오톡, 문자 등)",
    acceptTypes: "imageOnly",
    importance: "medium",
    isAutoCollected: false,
  },
  photos: {
    key: "photos",
    label: "사진",
    icon: "📸",
    description: "근무 현장, 근무 관련 증거 사진",
    acceptTypes: "imageOnly",
    importance: "low",
    isAutoCollected: false,
  },
  userInputHourlyWage: {
    key: "userInputHourlyWage",
    label: "시급 (직접 입력)",
    icon: "✏️",
    description: "계약서 없을 때 시급을 직접 입력",
    acceptTypes: "imageOnly",
    importance: "medium",
    isAutoCollected: false,
  },
  userInputWorkHours: {
    key: "userInputWorkHours",
    label: "근무시간 (직접 입력)",
    icon: "✏️",
    description: "계약서 없을 때 근무시간을 직접 입력",
    acceptTypes: "imageOnly",
    importance: "medium",
    isAutoCollected: false,
  },
};

/** 사용자가 파일로 직접 추가 가능한 evidence 종류 (텍스트 입력 항목 제외). */
export type FileEvidenceKey = Exclude<
  keyof EvidenceState,
  "userInputHourlyWage" | "userInputWorkHours"
>;

export const FILE_EVIDENCE_KEYS: FileEvidenceKey[] = [
  "contracts",
  "workLogs",
  "bankRecords",
  "paystubs",
  "chatLogs",
  "photos",
];

/**
 * 미지급금 계산 가능 여부 — 두 축(받아야 할 / 받은) 각각에 증거가 있는지로 결정.
 * - none: 아무 증거도 없음
 * - partial_wage: 시급/근무시간만 있음 (받아야 할 금액만 계산 가능)
 * - partial_paid: 통장/명세서만 있음 (실제 받은 금액만 확인 가능)
 * - ready: 양쪽 다 있음 → 미지급금 산정 가능
 */
export type AmountCalcReadiness =
  | "none"
  | "partial_wage"
  | "partial_paid"
  | "ready";

export function getAmountCalcReadiness(e: EvidenceState): AmountCalcReadiness {
  const hasWageInfo =
    e.contracts > 0 ||
    e.workLogs > 0 ||
    e.userInputHourlyWage !== null ||
    e.userInputWorkHours !== null;

  const hasPaidInfo = e.bankRecords > 0 || e.paystubs > 0;

  if (!hasWageInfo && !hasPaidInfo) return "none";
  if (hasWageInfo && !hasPaidInfo) return "partial_wage";
  if (!hasWageInfo && hasPaidInfo) return "partial_paid";
  return "ready";
}

export interface ReportCase {
  id: string;
  workplaceName: string;
  /** 사업자등록번호. 자동 검출 실패 시 null. */
  businessRegistrationNumber: string | null;
  /** 업종 — 멘토 매칭 / 후기 필터링 기준 (예: "카페·음식점"). */
  industry: string;
  /** 지역 — 후기 필터 / 표시용 (예: "서울 강남구"). */
  region: string;
  /** 피해 유형 — 멘토 매칭 기준 (예: ["임금체불", "주휴수당"]). */
  damageTypes: string[];

  status: ReportStatus;
  /** 현재 진행 중인 단계 ID. 수정 모드에선 highestStep보다 작을 수 있음. */
  currentStep: CaseStep;
  /**
   * 진행한 적이 있는 가장 마지막 단계.
   * 사용자가 이전 단계로 되돌아가 수정해도 줄어들지 않음.
   *   - currentStep === highestStep: 신규 진행 중
   *   - currentStep < highestStep:    수정 모드
   */
  highestStep: CaseStep;
  /** 완료된 단계 ID 목록. completeStep 액션이 push, 중복 방지. */
  completedSteps: CaseStep[];

  /** 증거 상태 — EvidenceState (카운트 + 사용자 직접 입력값). */
  evidence: EvidenceState;
  /** 실제 업로드된 증거 파일 목록 — evidence 카운트와 동기 갱신. */
  evidenceFiles: EvidenceFile[];

  // 금액 (모두 null 시작 — 증거 없이는 금액 표시 안 함)
  /** 받아야 할 금액 (시급 × 근무시간). 계약서 + 근무기록 또는 사용자 입력 있을 때만. */
  calculatedWageOwed: number | null;
  /** 실제 받은 금액. 통장 내역 / 급여명세서 있을 때만. */
  calculatedPaidAmount: number | null;
  /** 미지급금 = Owed - Paid. 양쪽 다 있을 때만. */
  calculatedUnpaid: number | null;

  /** 사건 생성 시각 (ISO). */
  createdAt: string;
  /** status가 resolved로 전환된 시각 (ISO). updateCaseStatus가 자동 채움. */
  resolvedAt?: string;
  /** 노동청 제출 시각 (ISO). setSubmittedAt이 채움. */
  submittedAt?: string;

  /** 공동대응 그룹 ID — 참여 시. */
  groupId?: string;

  /** 진정서 초안 ID — ReportDraft entity 도입 시 사용. */
  draftId?: string;

  /**
   * Step 6 (investigation) 진행 중 서브 상태. 노동청 제출 직후 waiting_inspector로 자동 설정.
   * 사용자가 수동 버튼으로 awaiting_hearing → under_correction → resolved_confirm 순으로 갱신.
   */
  investigationStatus?: InvestigationSubStatus;

  /**
   * Step 2 (amount_calculation) 서브 상태. 사건 생성 시 'idle'로 초기화.
   * 사용자가 "금액 계산 시작" 누르면 calculating → done(확인 대기) → confirmed(다음 단계).
   */
  amountCalcState: AmountCalcState;

  /**
   * 후기 작성 완료 여부. ReviewWriteView가 addReview 직후 true로 갱신.
   * 사건 상세/리스트 카드에서 "후기 쓰기" 버튼을 숨길지 결정하는 단일 기준.
   */
  hasWrittenReview?: boolean;
}
