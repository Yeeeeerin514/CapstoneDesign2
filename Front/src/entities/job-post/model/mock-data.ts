import type {
  ContractAnalysisResult,
  FavoriteWorkplace,
  JobPostAnalysisResult,
} from "./types";

// 공고 분석 결과 목업 (개발 중 UI 미리보기 용도, 실서비스 호출은 analyzeJobPost 사용)
export const MOCK_JOB_ANALYSIS: JobPostAnalysisResult = {
  analysisId: null,
  workplaceName: "OO카페 강남점",
  hourlyWage: 10000,
  workHours: "09:00~18:00",
  hasWeeklyHolidayPay: false,
  businessStatus: "정상",
  wageDelinquencyCount: 2,
  minimumWage2026: 10030,
  summary: "임금체불 이력 2건, 최저임금 미달, 주휴수당 미언급",
  overallAssessment: null,
  userReport: "",
  imageUrl: null,
  issues: [
    {
      level: "danger",
      title: "임금체불 이력 있음",
      description: "고용노동부 명단공개 데이터 2건 일치",
      evidence: null,
    },
  ],
  extracted: {
    businessName: "OO카페 강남점",
    brandName: null,
    businessRegistrationNumber: null,
    phone: null,
    address: null,
    jobTitle: null,
    hourlyWageText: "10,000원",
    workTimeText: "09:00~18:00",
    workScheduleText: null,
    contractPeriod: null,
    employmentType: null,
    benefits: [],
    suspiciousPhrases: [],
    missingInformation: [],
  },
  candidates: [],
  externalChecks: [],
};

// 계약서 분석 결과 목업
export const MOCK_CONTRACT_ANALYSIS: ContractAnalysisResult = {
  contractId: null,
  workplaceName: "OO카페 강남점",
  contractPeriod: "2026.04",
  hourlyWage: 10000,
  minimumWage: 10030,
  estimatedMonthlyPay: 2080000,
  overallRisk: "high",
  summary: "최저임금 미달 + 주휴수당 미명시 + 연장수당 조항 누락",
  imageUrl: null,
  issues: [
    {
      level: "warning",
      title: "주휴수당 명시 누락",
      description:
        "주 15시간 이상 근무 시 주휴수당 지급이 의무이나 계약서에 명시 없음",
      legalBasis: "근로기준법 제55조",
      legalBasisExcerpt: null,
      type: "WEEKLY_HOLIDAY",
    },
  ],
  extracted: {
    hourlyWage: 10000,
    monthlyWage: null,
    dailyWage: null,
    workingHoursPerDay: 8,
    workingDaysPerWeek: 5,
    startDate: null,
    workPlace: null,
    jobDescription: null,
    weeklyHolidayAllowanceMentioned: false,
    overtimeAllowanceMentioned: false,
    annualLeaveMentioned: false,
    breakTimeMentioned: null,
    employerName: "OO카페 강남점",
    businessRegistrationNumber: null,
  },
};

// 관심업장 초기 목업
export const MOCK_FAVORITE_WORKPLACES: FavoriteWorkplace[] = [];
