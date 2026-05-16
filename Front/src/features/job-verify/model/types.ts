import type { IssueSeverity } from "@/entities/contract";

/** 공고 분석 결과 한 이슈. ContractIssue와 동일 구조 — severity 토큰을 contract 슬라이스에서 재사용. */
export interface JobIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  legalBasis: string;
  recommendation: string;
}

export interface JobVerifyResult {
  workplaceName: string | null;
  hourlyWage: number | null;
  hasHolidayAllowance: boolean | null;
  hasFourMajorInsurances: boolean | null;
  /** 사업장 운영 상태 (예: "정상 운영", "폐업"). */
  operationalStatus: string | null;
  /** 임금체불 이력 (예: "없음", "1건 확인"). */
  wageArrearsHistory: string | null;
  /** 전반적인 분석 요약 문장. */
  analysisSummary: string | null;
  issues: JobIssue[];
}

/** 분석 단계. UI 진행 표시에 사용. */
export type AnalyzingStage =
  | "idle"
  | "extracting"
  | "comparing"
  | "reviewing"
  | "done"
  | "error";

/** 홈 하단 "최근 분석 공고" 목록 항목. 세션 내 메모리 보관용. */
export interface RecentAnalysis {
  id: string;
  /** ISO 시각. */
  analyzedAt: string;
  workplaceName: string | null;
  issueCount: number;
  topSeverity: IssueSeverity | null;
}
