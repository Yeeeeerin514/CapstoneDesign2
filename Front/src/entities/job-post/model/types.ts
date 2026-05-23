// 공고 분석 결과
export interface JobPostAnalysisResult {
  workplaceName: string; // 업장명
  hourlyWage: number; // 시급
  workHours: string; // 근무 시간 (예: "09:00~18:00")
  hasWeeklyHolidayPay: boolean; // 주휴수당 언급 여부
  businessStatus: "정상" | "폐업" | "확인불가"; // 국세청 조회 결과
  wageDelinquencyCount: number; // 임금체불 이력 건수
  minimumWage2026: number; // 2026년 최저임금 기준 (10030)
  issues: JobPostIssue[]; // 발견된 문제 목록
}

export interface JobPostIssue {
  level: "danger" | "warning" | "info";
  title: string;
  description: string;
}

// 관심업장 (참고용 — 실제 store는 features/favorite-workplace 에 존재)
export interface FavoriteWorkplace {
  id: string;
  name: string;
  analysisResult?: JobPostAnalysisResult;
  contractStatus: "none" | "uploaded" | "analyzed";
  bssidStatus: "none" | "registered";
  createdAt: string;
}

// ───────────────────────────────────────────────
// 계약서 OCR 분석 결과 — AI 응답이 이 형태로 그대로 들어옴
// ───────────────────────────────────────────────

export type ContractIssueLevel = "danger" | "warning" | "info";

export interface ContractTextSegment {
  text: string;
  issueId?: string; // issues[].id와 매칭. 없으면 일반 텍스트
}

export interface ContractIssue {
  id: string; // "issue-1" 형식, textSegments의 issueId와 매칭
  number: number; // 화면에 표시할 번호 (1, 2, 3...)
  level: ContractIssueLevel;
  title: string;
  description: string; // 사용자 친화적 설명
  originalText: string; // 원문에서 문제된 부분
  legalBasis: {
    law: string; // "최저임금법 제6조"
    description: string; // 법 조항 설명
  };
  recommendation: string; // 해결 방안 안내
  actionable?: {
    type: "report" | "consult" | "rewrite";
    label: string; // "고용노동부 신고하기" 등
  };
}

export interface ContractAnalysisResult {
  workplaceName: string;
  contractPeriod: {
    start: string; // ISO 형식 "2026-04-01"
    end: string;
  };
  hourlyWage: number;
  estimatedMonthlyWage: number;

  // OCR로 추출한 전체 텍스트 (검증/디버깅용)
  fullText: string;

  // 본문을 조각으로 자른 배열 — UI는 이걸 순회하며 렌더
  textSegments: ContractTextSegment[];

  issues: ContractIssue[];
}

// ───────────────────────────────────────────────
// 백엔드 API 응답 (snake_case) — 매퍼로 camelCase 변환
// ───────────────────────────────────────────────

export interface ApiJobPostAnalysisResponse {
  workplace_name: string;
  hourly_wage: number;
  work_hours: string;
  has_weekly_holiday_pay: boolean;
  business_status: "정상" | "폐업" | "확인불가";
  wage_delinquency_count: number;
  issues: Array<{
    level: "danger" | "warning" | "info";
    title: string;
    description: string;
  }>;
}

export function mapApiResponseToAnalysisResult(
  api: ApiJobPostAnalysisResponse,
): JobPostAnalysisResult {
  return {
    workplaceName: api.workplace_name,
    hourlyWage: api.hourly_wage,
    workHours: api.work_hours,
    hasWeeklyHolidayPay: api.has_weekly_holiday_pay,
    businessStatus: api.business_status,
    wageDelinquencyCount: api.wage_delinquency_count,
    minimumWage2026: 10030,
    issues: api.issues,
  };
}

export interface ApiContractAnalysisResponse {
  workplace_name: string;
  contract_period: { start: string; end: string };
  hourly_wage: number;
  estimated_monthly_wage: number;
  full_text: string;
  text_segments: Array<{ text: string; issue_id?: string }>;
  issues: Array<{
    id: string;
    number: number;
    level: ContractIssueLevel;
    title: string;
    description: string;
    original_text: string;
    legal_basis: { law: string; description: string };
    recommendation: string;
    actionable?: { type: "report" | "consult" | "rewrite"; label: string };
  }>;
}

export function mapApiResponseToContractResult(
  api: ApiContractAnalysisResponse,
): ContractAnalysisResult {
  return {
    workplaceName: api.workplace_name,
    contractPeriod: api.contract_period,
    hourlyWage: api.hourly_wage,
    estimatedMonthlyWage: api.estimated_monthly_wage,
    fullText: api.full_text,
    textSegments: api.text_segments.map((s) => ({
      text: s.text,
      issueId: s.issue_id,
    })),
    issues: api.issues.map((i) => ({
      id: i.id,
      number: i.number,
      level: i.level,
      title: i.title,
      description: i.description,
      originalText: i.original_text,
      legalBasis: i.legal_basis,
      recommendation: i.recommendation,
      actionable: i.actionable,
    })),
  };
}
