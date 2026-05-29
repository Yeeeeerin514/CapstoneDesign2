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

// 계약서 OCR 분석 결과 목업 — 새 데이터 형식 (main) 기준
export const MOCK_CONTRACT_ANALYSIS: ContractAnalysisResult = {
  contractId: null,
  workplaceName: "OO카페 강남점",
  contractPeriod: "2026-04-01",
  hourlyWage: 10000,
  minimumWage: 10030,
  estimatedMonthlyPay: 2080000,
  overallRisk: "high",
  summary: "최저임금 미달 + 주휴수당 미명시 + 연장수당 조항 누락",
  imageUrl: null,
  issues: [
    {
      id: "issue-1",
      number: 1,
      level: "danger",
      title: "최저임금 미달",
      description:
        "시급 10,000원은 2026년 최저임금 10,030원에 미달합니다.",
      legalBasis: "최저임금법 제6조",
      legalBasisExcerpt:
        "사용자는 최저임금액 이상의 임금을 지급해야 합니다.",
      type: "MINIMUM_WAGE",
      recommendation:
        "시급 10,030원 이상으로 수정을 요청하거나, 미지급 시 고용노동부에 신고할 수 있습니다.",
      actionable: { type: "report", label: "고용노동부 신고하기" },
    },
    {
      id: "issue-2",
      number: 2,
      level: "warning",
      title: "연장수당 규정 누락",
      description:
        "주 40시간 초과 근무 시 통상임금의 1.5배 가산수당 조항이 계약서에 명시되어 있지 않습니다.",
      legalBasis: "근로기준법 제56조",
      legalBasisExcerpt:
        "연장근로에 대해서는 통상임금의 50% 이상을 가산하여 지급해야 합니다.",
      type: "OVERTIME_PAY",
      recommendation:
        "연장근로수당 1.5배 지급 조항을 명시해 달라고 요청하세요.",
    },
    {
      id: "issue-3",
      number: 3,
      level: "warning",
      title: "주휴수당 명시 누락",
      description:
        "주 15시간 이상 근무 시 주휴수당 지급이 의무이나 계약서에 명시 없음",
      legalBasis: "근로기준법 제55조",
      legalBasisExcerpt: null,
      type: "WEEKLY_HOLIDAY",
      recommendation: "주휴수당 지급 조항 추가를 요청하세요.",
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
