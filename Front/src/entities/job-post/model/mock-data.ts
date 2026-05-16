import type {
  ContractAnalysisResult,
  FavoriteWorkplace,
  JobPostAnalysisResult,
} from "./types";

// 공고 분석 결과 목업
export const MOCK_JOB_ANALYSIS: JobPostAnalysisResult = {
  workplaceName: "OO카페 강남점",
  hourlyWage: 10000,
  workHours: "09:00~18:00",
  hasWeeklyHolidayPay: false,
  businessStatus: "정상",
  wageDelinquencyCount: 2,
  minimumWage2026: 10030,
  issues: [
    {
      level: "danger",
      title: "임금체불 이력 있음",
      description: "고용24 조회 결과 2건 접수",
    },
    {
      level: "danger",
      title: "시급 최저임금 기준 미달",
      description: "10,000원 < 2026년 기준 10,030원",
    },
    {
      level: "warning",
      title: "주휴수당 미언급",
      description: "주 15시간 이상 근무 시 의무 지급",
    },
  ],
};

// 계약서 분석 결과 목업
export const MOCK_CONTRACT_ANALYSIS: ContractAnalysisResult = {
  workplaceName: "OO카페 강남점",
  contractPeriod: "2026.04",
  hourlyWage: 10000,
  estimatedMonthlyPay: 2080000,
  overallRisk: "high",
  issues: [
    {
      level: "warning",
      title: "주휴수당 명시 누락",
      description:
        "주 15시간 이상 근무 시 주휴수당 지급이 의무이나 계약서에 명시 없음",
      legalBasis: "근로기준법 제55조",
    },
    {
      level: "danger",
      title: "연장수당 규정 불명",
      description:
        "주 40시간 초과 근무 시 1.5배 가산수당 조항이 계약서에 없음",
      legalBasis: "근로기준법 제56조",
    },
    {
      level: "info",
      title: "퇴직금 안내 누락",
      description: "1년 이상 근무 시 퇴직금이 발생하나 계약서에 미기재",
      legalBasis: "근로자퇴직급여보장법 제8조",
    },
  ],
};

// 관심업장 초기 목업 (빈 배열 — 실제로 별 눌러서 추가함)
export const MOCK_FAVORITE_WORKPLACES: FavoriteWorkplace[] = [];
