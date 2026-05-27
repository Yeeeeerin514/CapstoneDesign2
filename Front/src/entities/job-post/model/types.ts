// ─────────────────────────────────────────────────────────────────────
//  공고문 분석 — 프론트 표현 모델 (UI에서 직접 사용)
// ─────────────────────────────────────────────────────────────────────

export interface BusinessCandidate {
  businessName: string;
  address: string;
  industry: string;
  businessStatus: string;
  matchScore: number;
}

export interface ExternalCheck {
  source: string;
  status: "RISK" | "CLEAR" | "SKIPPED" | "NOT_CONFIGURED" | "UNAVAILABLE";
  title: string;
  description: string;
  evidence: string | null;
}

export interface ExtractedPosting {
  businessName: string | null;
  brandName: string | null;
  businessRegistrationNumber: string | null;
  phone: string | null;
  address: string | null;
  jobTitle: string | null;
  hourlyWageText: string | null;
  workTimeText: string | null;
  workScheduleText: string | null;
  employmentType: string | null;
  benefits: string[];
  suspiciousPhrases: string[];
  missingInformation: string[];
}

export interface JobPostAnalysisResult {
  analysisId: number | null;
  workplaceName: string;
  hourlyWage: number;
  workHours: string;
  hasWeeklyHolidayPay: boolean;
  businessStatus: "정상" | "폐업" | "확인불가";
  wageDelinquencyCount: number;
  minimumWage2026: number;
  issues: JobPostIssue[];
  summary: string;
  /** OpenAI가 직접 내린 한 줄 평가 (지원해도 무방 / 조건 확인 후 / 비권장). */
  overallAssessment: string | null;
  userReport: string;
  imageUrl: string | null;
  extracted: ExtractedPosting;
  candidates: BusinessCandidate[];
  externalChecks: ExternalCheck[];
}

export interface JobPostIssue {
  level: "danger" | "warning" | "info";
  title: string;
  description: string;
  evidence: string | null;
}

// 관심업장 (로컬 store)
export interface FavoriteWorkplace {
  id: string;
  name: string;
  analysisResult?: JobPostAnalysisResult;
  contractStatus: "none" | "uploaded" | "analyzed";
  bssidStatus: "none" | "registered";
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────
//  계약서 분석 — 프론트 표현 모델
// ─────────────────────────────────────────────────────────────────────
export interface ExtractedContract {
  hourlyWage: number | null;
  workingHoursPerDay: number | null;
  workingDaysPerWeek: number | null;
  startDate: string | null;
  workPlace: string | null;
  jobDescription: string | null;
  weeklyHolidayAllowanceMentioned: boolean | null;
  overtimeAllowanceMentioned: boolean | null;
  annualLeaveMentioned: boolean | null;
  employerName: string | null;
  businessRegistrationNumber: string | null;
}

export interface ContractAnalysisResult {
  contractId: number | null;
  workplaceName: string;
  contractPeriod: string;
  hourlyWage: number;
  minimumWage: number;
  estimatedMonthlyPay: number;
  issues: ContractIssue[];
  overallRisk: "high" | "medium" | "low";
  summary: string;
  imageUrl: string | null;
  extracted: ExtractedContract;
}

export interface ContractIssue {
  level: "danger" | "warning" | "info";
  title: string;
  description: string;
  legalBasis: string;
  legalBasisExcerpt: string | null;
  type: string;
}

// ─────────────────────────────────────────────────────────────────────
//  백엔드 응답 타입 (camelCase 그대로) + 매핑 함수
// ─────────────────────────────────────────────────────────────────────
const MIN_WAGE = 10030;

interface ApiLlmConcern {
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  evidence: string | null;
}

interface ApiExtractedJobPosting {
  businessName: string | null;
  brandName: string | null;
  businessRegistrationNumber: string | null;
  phone: string | null;
  address: string | null;
  jobTitle: string | null;
  industryHint: string | null;
  hourlyWageText: string | null;
  hourlyWage: number | null;
  workScheduleText: string | null;
  workDays: string[];
  workTimeText: string | null;
  employmentType: string | null;
  benefits: string[];
  suspiciousPhrases: string[];
  missingInformation: string[];
  llmConcerns: ApiLlmConcern[];
  overallAssessment: string | null;
  rawSummary: string | null;
}

interface ApiBusinessCandidate {
  businessName: string | null;
  address: string | null;
  roadAddress: string | null;
  industry: string | null;
  businessStatus: string | null;
  matchScore: number;
}

interface ApiExternalRiskCheck {
  source: string;
  status: "RISK" | "CLEAR" | "SKIPPED" | "NOT_CONFIGURED" | "UNAVAILABLE";
  title: string;
  description: string;
  evidence: string | null;
}

interface ApiConcernItem {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  evidence: string | null;
}

export interface ApiJobPostingAnalysisResponse {
  analysisId: number;
  extracted: ApiExtractedJobPosting;
  businessCandidates: ApiBusinessCandidate[];
  imageUrl: string | null;
  externalChecks: ApiExternalRiskCheck[];
  concerns: ApiConcernItem[];
  finalSummary: string;
  userReport: string;
  openAiUsed: boolean;
}

function severityToLevel(
  s: "HIGH" | "MEDIUM" | "LOW",
): JobPostIssue["level"] {
  if (s === "HIGH") return "danger";
  if (s === "MEDIUM") return "warning";
  return "info";
}

function mapBusinessStatus(
  raw: string | null | undefined,
): JobPostAnalysisResult["businessStatus"] {
  if (!raw) return "확인불가";
  if (/(폐업|휴업|말소|취소)/.test(raw)) return "폐업";
  if (/(정상|영업|계속사업자)/.test(raw)) return "정상";
  return "확인불가";
}

export function mapJobPostingApiResponse(
  api: ApiJobPostingAnalysisResponse,
): JobPostAnalysisResult {
  const ex = api.extracted ?? ({} as ApiExtractedJobPosting);
  const topCandidate = api.businessCandidates?.[0];

  const workplaceName =
    ex.businessName ?? ex.brandName ?? topCandidate?.businessName ?? "확인불가";

  const workHours =
    ex.workTimeText ?? ex.workScheduleText ?? "확인불가";

  const hasWeeklyHolidayPay =
    !(ex.missingInformation ?? []).some((m) => m.includes("주휴수당"));

  // NTS API 결과를 우선 반영
  const ntsCheck = (api.externalChecks ?? []).find(
    (c) => c.source === "NTS_BUSINESS_STATUS",
  );
  let businessStatus: JobPostAnalysisResult["businessStatus"];
  if (ntsCheck?.status === "RISK") {
    businessStatus = "폐업";
  } else if (ntsCheck?.status === "CLEAR") {
    businessStatus = "정상";
  } else {
    businessStatus = mapBusinessStatus(topCandidate?.businessStatus);
  }

  const wageDelinquencyCount = (api.externalChecks ?? []).filter(
    (c) => c.source === "WAGE_ARREARS_DB" && c.status === "RISK",
  ).length;

  const issues: JobPostIssue[] = (api.concerns ?? []).map((c) => ({
    level: severityToLevel(c.severity),
    title: c.title,
    description: c.description,
    evidence: c.evidence,
  }));

  const candidates: BusinessCandidate[] = (api.businessCandidates ?? [])
    .slice(0, 5)
    .map((c) => ({
      businessName: c.businessName ?? "이름없음",
      address: c.roadAddress ?? c.address ?? "주소 미확인",
      industry: c.industry ?? "업종 미확인",
      businessStatus: c.businessStatus ?? "상태 미확인",
      matchScore: c.matchScore,
    }));

  const externalChecks: ExternalCheck[] = (api.externalChecks ?? []).map(
    (c) => ({
      source: c.source,
      status: c.status,
      title: c.title,
      description: c.description,
      evidence: c.evidence,
    }),
  );

  return {
    analysisId: api.analysisId ?? null,
    workplaceName,
    hourlyWage: ex.hourlyWage ?? 0,
    workHours,
    hasWeeklyHolidayPay,
    businessStatus,
    wageDelinquencyCount,
    minimumWage2026: MIN_WAGE,
    issues,
    summary: api.finalSummary ?? "",
    overallAssessment: ex.overallAssessment ?? null,
    userReport: api.userReport ?? "",
    imageUrl: api.imageUrl ?? null,
    extracted: {
      businessName: ex.businessName,
      brandName: ex.brandName,
      businessRegistrationNumber: ex.businessRegistrationNumber,
      phone: ex.phone,
      address: ex.address,
      jobTitle: ex.jobTitle,
      hourlyWageText: ex.hourlyWageText,
      workTimeText: ex.workTimeText,
      workScheduleText: ex.workScheduleText,
      employmentType: ex.employmentType,
      benefits: ex.benefits ?? [],
      suspiciousPhrases: ex.suspiciousPhrases ?? [],
      missingInformation: ex.missingInformation ?? [],
    },
    candidates,
    externalChecks,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  계약서 백엔드 응답 + 매핑 함수
// ─────────────────────────────────────────────────────────────────────
interface ApiExtractedContractInfo {
  hourlyWage: number | null;
  workingHoursPerDay: number | null;
  workingDaysPerWeek: number | null;
  startDate: string | null;
  workPlace: string | null;
  jobDescription: string | null;
  weeklyHolidayAllowanceMentioned: boolean | null;
  overtimeAllowanceMentioned: boolean | null;
  annualLeaveMentioned: boolean | null;
  employerName: string | null;
  businessRegistrationNumber: string | null;
}

interface ApiContractViolation {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  legalBasis: string;
  legalBasisExcerpt: string | null;
}

export interface ApiContractAnalysisResponse {
  contractId: number;
  hasViolation: boolean;
  extractedInfo: ApiExtractedContractInfo | null;
  violations: ApiContractViolation[];
  summary: string | null;
  minimumWage: number;
  imageUrl: string | null;
  createdAt: string;
}

const VIOLATION_TITLE: Record<string, string> = {
  MINIMUM_WAGE: "최저임금 미달",
  OVERTIME_PAY: "연장수당 규정 누락",
  WEEKLY_HOLIDAY: "주휴수당 명시 누락",
  MANDATORY_ITEMS: "필수 기재사항 누락",
  WORKING_HOURS: "근로시간 불명확",
  ANNUAL_LEAVE: "연차휴가 명시 누락",
  REST_TIME: "휴게시간 미명시",
};

export function mapContractApiResponse(
  api: ApiContractAnalysisResponse,
  fallbackWorkplaceName: string,
): ContractAnalysisResult {
  const info = api.extractedInfo;

  const hourlyWage = info?.hourlyWage ?? 0;
  const hoursPerDay = info?.workingHoursPerDay ?? 0;
  const daysPerWeek = info?.workingDaysPerWeek ?? 0;
  // 월 환산: 시급 × 일 근무시간 × 주 근무일수 × 약 4.345주(연 평균)
  const estimatedMonthlyPay = Math.round(
    hourlyWage * hoursPerDay * daysPerWeek * 4.345,
  );

  const issues: ContractIssue[] = (api.violations ?? []).map((v) => ({
    level: severityToLevel(v.severity),
    title: VIOLATION_TITLE[v.type] ?? v.type,
    description: v.description,
    legalBasis: v.legalBasis,
    legalBasisExcerpt: v.legalBasisExcerpt ?? null,
    type: v.type,
  }));

  const severities = (api.violations ?? []).map((v) => v.severity);
  const overallRisk: ContractAnalysisResult["overallRisk"] = severities.includes(
    "HIGH",
  )
    ? "high"
    : severities.includes("MEDIUM")
      ? "medium"
      : "low";

  return {
    contractId: api.contractId ?? null,
    workplaceName: info?.employerName ?? fallbackWorkplaceName,
    contractPeriod: info?.startDate ?? "확인불가",
    hourlyWage,
    minimumWage: api.minimumWage,
    estimatedMonthlyPay,
    issues,
    overallRisk,
    summary: api.summary ?? "",
    imageUrl: api.imageUrl ?? null,
    extracted: {
      hourlyWage: info?.hourlyWage ?? null,
      workingHoursPerDay: info?.workingHoursPerDay ?? null,
      workingDaysPerWeek: info?.workingDaysPerWeek ?? null,
      startDate: info?.startDate ?? null,
      workPlace: info?.workPlace ?? null,
      jobDescription: info?.jobDescription ?? null,
      weeklyHolidayAllowanceMentioned:
        info?.weeklyHolidayAllowanceMentioned ?? null,
      overtimeAllowanceMentioned: info?.overtimeAllowanceMentioned ?? null,
      annualLeaveMentioned: info?.annualLeaveMentioned ?? null,
      employerName: info?.employerName ?? null,
      businessRegistrationNumber: info?.businessRegistrationNumber ?? null,
    },
  };
}
