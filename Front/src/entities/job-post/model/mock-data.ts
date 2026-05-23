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

// 계약서 OCR 분석 결과 목업 — STEP 1 신규 타입에 맞춤
export const MOCK_CONTRACT_ANALYSIS: ContractAnalysisResult = {
  workplaceName: "OO카페 강남점",
  contractPeriod: { start: "2026-04-01", end: "2027-03-31" },
  hourlyWage: 10000,
  estimatedMonthlyWage: 2080000,

  fullText:
    "근로계약서\n\n제1조 (계약기간)\n2026.04.01 ~ 2027.03.31\n\n제2조 (임금)\n시급 10,000원\n\n제3조 (근로시간)\n주 40시간 근무\n초과근무 시 별도 수당 없음\n\n제4조 (퇴직금)\n(별도 명시 없음)",

  textSegments: [
    {
      text:
        "근로계약서\n\n제1조 (계약기간)\n2026.04.01 ~ 2027.03.31\n\n제2조 (임금)\n시급 ",
    },
    { text: "10,000원", issueId: "issue-1" },
    { text: "\n\n제3조 (근로시간)\n주 40시간 근무\n" },
    { text: "초과근무 시 별도 수당 없음", issueId: "issue-2" },
    { text: "\n\n제4조 (퇴직금)\n" },
    { text: "(별도 명시 없음)", issueId: "issue-3" },
  ],

  issues: [
    {
      id: "issue-1",
      number: 1,
      level: "danger",
      title: "최저임금 미달",
      description:
        "시급 10,000원은 2026년 최저임금 10,030원에 미달합니다.",
      originalText: "시급 10,000원",
      legalBasis: {
        law: "최저임금법 제6조",
        description: "사용자는 최저임금액 이상의 임금을 지급해야 합니다.",
      },
      recommendation:
        "시급 10,030원 이상으로 수정을 요청하거나, 미지급 시 고용노동부에 신고할 수 있습니다.",
      actionable: { type: "report", label: "고용노동부 신고하기" },
    },
    {
      id: "issue-2",
      number: 2,
      level: "warning",
      title: "연장수당 규정 불명",
      description:
        "주 40시간 초과 근무 시 통상임금의 1.5배 가산수당 조항이 계약서에 명시되어 있지 않습니다.",
      originalText: "초과근무 시 별도 수당 없음",
      legalBasis: {
        law: "근로기준법 제56조",
        description:
          "연장근로에 대해서는 통상임금의 50% 이상을 가산하여 지급해야 합니다.",
      },
      recommendation:
        "연장근로수당 1.5배 지급 조항을 명시해 달라고 요청하세요.",
    },
    {
      id: "issue-3",
      number: 3,
      level: "warning",
      title: "퇴직금 안내 누락",
      description:
        "1년 이상 근무 시 퇴직금이 발생하나 계약서에 관련 조항이 없습니다.",
      originalText: "(별도 명시 없음)",
      legalBasis: {
        law: "근로자퇴직급여보장법 제8조",
        description: "1년 이상 근속한 근로자에게 퇴직금을 지급해야 합니다.",
      },
      recommendation: "퇴직금 지급 조항 추가를 요청하세요.",
    },
  ],
};

// 관심업장 초기 목업 (빈 배열 — 실제로 별 눌러서 추가함)
export const MOCK_FAVORITE_WORKPLACES: FavoriteWorkplace[] = [];
