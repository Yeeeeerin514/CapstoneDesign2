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
  issues: JobIssue[];
}
