/**
 * 계약서/공고 분석 결과의 위험도.
 * - danger:  위법 (예: 최저임금 미달)
 * - caution: 주의 (예: 주휴수당 미명시)
 * - info:    참고 (예: 4대보험 가입 여부 불명)
 */
export type IssueSeverity = "danger" | "caution" | "info";

export interface ContractIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  /** 법적 근거 (예: "근로기준법 제55조"). */
  legalBasis: string;
  recommendation: string;
}

export interface ContractAnalysis {
  contractId: string;
  workplaceName: string;
  /** "2026.01.01 ~ 2026.12.31" 같은 자유 형식. */
  contractPeriod: string;
  hourlyWage: number;
  /** 비교용 — 분석 시점 기준 최저시급. */
  minimumWage: number;
  issues: ContractIssue[];
}
