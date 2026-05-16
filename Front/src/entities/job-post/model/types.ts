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

// 관심업장
export interface FavoriteWorkplace {
  id: string;
  name: string;
  analysisResult?: JobPostAnalysisResult;
  contractStatus: "none" | "uploaded" | "analyzed";
  bssidStatus: "none" | "registered";
  createdAt: string;
}

// 계약서 분석 결과
export interface ContractAnalysisResult {
  workplaceName: string;
  contractPeriod: string;
  hourlyWage: number;
  estimatedMonthlyPay: number;
  issues: ContractIssue[];
  overallRisk: "high" | "medium" | "low";
}

export interface ContractIssue {
  level: "danger" | "warning" | "info";
  title: string;
  description: string;
  legalBasis: string;
}

/**
 * 백엔드 API 응답 구조 (실제 연결 시 이 타입으로 data를 받음)
 * 서버가 내려주는 JSON의 키 이름이 바뀌면 여기만 수정하면 됨
 */
export interface ApiJobPostAnalysisResponse {
  workplace_name: string;      // 서버 키 이름 (snake_case)
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

/**
 * API 응답을 앱 내부 타입으로 변환하는 함수
 * 백엔드 연결 시 analyzeJobPost 함수 안에서 사용
 */
export function mapApiResponseToAnalysisResult(
  api: ApiJobPostAnalysisResponse
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
