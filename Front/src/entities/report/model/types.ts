export type ReportStatus = "draft" | "submitted" | "resolved";

export type EvidenceType =
  | "bssid-log"   // BSSID 자동 근무 기록
  | "contract"    // 근로계약서
  | "bankbook"    // 통장 내역
  | "payslip"     // 급여명세서
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

export interface Report {
  id: string;
  workplaceId: string;
  workplaceName: string;
  estimatedUnpaidAmount: number;
  status: ReportStatus;
  evidences: ReportEvidence[];
  /** 연대 신고 여부. */
  isSolidarity: boolean;
  /** 연대 참여자 수 (본인 포함). */
  participantCount: number;
  /** ISO 생성 시각. */
  createdAt: string;
}
