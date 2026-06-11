import { getMinimumWage } from "@/shared/lib/minimum-wage-store";

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
  contractPeriod: string | null;
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
  /**
   * 이 분석으로 서버에 자동 저장된 관심업장(PartTimeJob status=FAVORITE) id.
   * 이후 알바 등록 시 registerWorkplace 의 partTimeJobId 로 전달해 FAVORITE→REGISTERED 승격에 사용.
   */
  favoritePartTimeJobId: number | null;
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
  registrationStatus: "none" | "registered";
  bssid?: string;
  ssid?: string;
  registeredAt?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────
//  계약서 분석 — 프론트 표현 모델
// ─────────────────────────────────────────────────────────────────────
export interface ExtractedContract {
  hourlyWage: number | null;
  monthlyWage: number | null;
  dailyWage: number | null;
  workingHoursPerDay: number | null;
  workingDaysPerWeek: number | null;
  startDate: string | null;
  workPlace: string | null;
  jobDescription: string | null;
  weeklyHolidayAllowanceMentioned: boolean | null;
  overtimeAllowanceMentioned: boolean | null;
  annualLeaveMentioned: boolean | null;
  breakTimeMentioned: boolean | null;
  employerName: string | null;
  businessRegistrationNumber: string | null;
  /** 근무 요일 — DayOfWeek enum string. 예: ["MONDAY","TUESDAY"]. */
  workDays: string[] | null;
  /** "09:00" (LocalTime). */
  workStartTime: string | null;
  /** "16:00" (LocalTime). */
  workEndTime: string | null;
  /** "2020-03-05" (LocalDate). */
  employmentStartDate: string | null;
  /** "2021-03-04" (LocalDate). */
  contractEndDate: string | null;
  /** "매월 5일" 등 자유 텍스트. */
  wagePaymentDate: string | null;
  /** "계좌이체" 등. */
  wagePaymentMethod: string | null;
  /** "12:00" (LocalTime). */
  breakStartTime: string | null;
  /** "13:00" (LocalTime). */
  breakEndTime: string | null;
  employerAddress: string | null;
  employerPhone: string | null;
  employerRepresentative: string | null;
}

// ─────────────────────────────────────────────────────────────────────
//  계약서 분석 — 프론트 표현 모델
// ─────────────────────────────────────────────────────────────────────

export type ContractIssueLevel = "danger" | "warning" | "info";

export interface ContractIssue {
  id?: string;
  number?: number;
  level: ContractIssueLevel;
  title: string;
  description: string;
  originalText?: string;
  /** 관련 법령 — 자유 텍스트 또는 구조화 객체. mock과 백엔드 호환. */
  legalBasis?: string | { law: string; description: string };
  /** 법령 발췌. */
  legalBasisExcerpt?: string | null;
  /** 백엔드 enum 식별자 (e.g. "MINIMUM_WAGE"). */
  type?: string;
  recommendation?: string;
  actionable?: { type: string; label: string };
  /** 관련 판례/사례 — 백엔드가 첨부 시 제공. */
  relatedCases?: RelatedCase[];
}

export interface RelatedCase {
  sourceType: string;
  header: string;
  excerpt: string;
}

export interface ContractTextSegment {
  text: string;
  highlight?: ContractIssueLevel;
  issueId?: string;
}

export interface ContractAnalysisResult {
  contractId: number | null;
  workplaceName: string;
  contractPeriod: string;
  hourlyWage: number;
  /** hourlyWage가 계약서 명시 시급이 아니라 월급/일급에서 역산된 값이면 true */
  isDerivedHourlyWage?: boolean;
  minimumWage: number;
  estimatedMonthlyPay: number;
  issues: ContractIssue[];
  overallRisk: "high" | "medium" | "low";
  summary: string;
  imageUrl: string | null;
  extracted: ExtractedContract;
}

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
  contractPeriod: string | null;
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
  /** 이 분석으로 자동 생성/갱신된 관심업장(PartTimeJob status=FAVORITE) id. */
  favoritePartTimeJobId: number | null;
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
    minimumWage2026: getMinimumWage().wage,
    issues,
    summary: api.finalSummary ?? "",
    favoritePartTimeJobId: api.favoritePartTimeJobId ?? null,
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
      contractPeriod: ex.contractPeriod ?? null,
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

export interface ApiExtractedContractInfo {
  hourlyWage: number | null;
  monthlyWage: number | null;
  dailyWage: number | null;
  workingHoursPerDay: number | null;
  workingDaysPerWeek: number | null;
  startDate: string | null;
  workPlace: string | null;
  jobDescription: string | null;
  weeklyHolidayAllowanceMentioned: boolean | null;
  overtimeAllowanceMentioned: boolean | null;
  annualLeaveMentioned: boolean | null;
  breakTimeMentioned: boolean | null;
  employerName: string | null;
  businessRegistrationNumber: string | null;
  workDays: string[] | null;
  workStartTime: string | null;
  workEndTime: string | null;
  employmentStartDate: string | null;
  contractEndDate: string | null;
  wagePaymentDate: string | null;
  wagePaymentMethod: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  employerAddress: string | null;
  employerPhone: string | null;
  employerRepresentative: string | null;
}

/**
 * 계약서 백엔드 응답 — POST /api/contracts/analyze.
 * extracted 필드 + LLM 요약/우려사항.
 */
export interface ApiContractViolation {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  legalBasis: string | null;
  legalBasisExcerpt: string | null;
  relatedCases: RelatedCase[] | null;
}

/**
 * 계약서 백엔드 응답 — POST /api/contracts/analyze (실제 백엔드 ContractAnalysisResponse 형태).
 */
/**
 * 백엔드 factSheet 중 프론트가 사용하는 최소 필드.
 * hourlyWage는 「명시 시급 → 월급/일급 역산」 순의 유효 시급 —
 * extractedInfo.calculatedHourlyWage가 @JsonIgnore라 역산값은 이 경로로만 내려온다.
 */
export interface ApiContractFactSheet {
  hourlyWage: number | null;
  monthlyWage: number | null;
  minimumWage: number;
}

export interface ApiContractAnalysisResponse {
  contractId: number | null;
  hasViolation: boolean;
  extractedInfo: ApiExtractedContractInfo;
  violations: ApiContractViolation[];
  summary: string;
  minimumWage: number;
  imageUrl: string | null;
  /** 진정서용 정형 데이터 — 프론트는 유효 시급(역산 포함) 폴백으로만 사용. */
  factSheet?: ApiContractFactSheet | null;
  createdAt?: string;
}

/** 백엔드 위반유형 enum → 사용자 표시용 한글 제목 */
const CONTRACT_TYPE_LABEL: Record<string, string> = {
  MINIMUM_WAGE: "최저임금 미달",
  WEEKLY_HOLIDAY: "주휴수당 미보장",
  OVERTIME_PAY: "연장·야간수당 누락",
  REST_TIME: "휴게시간 미보장",
  ANNUAL_LEAVE: "연차휴가 누락",
  MANDATORY_ITEMS: "필수 기재사항 누락",
  WORKING_HOURS: "법정 근로시간 위반",
};

function contractSeverityToLevel(s: string): ContractIssueLevel {
  if (s === "HIGH") return "danger";
  if (s === "MEDIUM") return "warning";
  return "info";
}

/**
 * 백엔드 응답 → 프론트 ContractAnalysisResult 매핑.
 */
export function mapContractApiResponse(
  api: ApiContractAnalysisResponse,
): ContractAnalysisResult {
  const ex = api.extractedInfo ?? ({} as ApiExtractedContractInfo);
  const violations = api.violations ?? [];

  const issues: ContractIssue[] = violations.map((v, idx) => ({
    id: `${v.type ?? "ISSUE"}-${idx}`,
    number: idx + 1,
    level: contractSeverityToLevel(v.severity),
    type: v.type,
    title: CONTRACT_TYPE_LABEL[v.type] ?? v.legalBasis ?? "계약서 확인 필요",
    description: v.description,
    legalBasis: v.legalBasis ?? undefined,
    legalBasisExcerpt: v.legalBasisExcerpt ?? null,
    relatedCases: v.relatedCases ?? undefined,
  }));

  let overallRisk: "high" | "medium" | "low" = "low";
  if (violations.some((v) => v.severity === "HIGH")) overallRisk = "high";
  else if (violations.some((v) => v.severity === "MEDIUM")) overallRisk = "medium";

  const contractPeriod =
    ex.employmentStartDate != null
      ? `${ex.employmentStartDate} ~ ${ex.contractEndDate ?? "기간없음"}`
      : "";

  // 시급: 명시 시급 → 백엔드 역산 시급(factSheet.hourlyWage) 순.
  const derivedWage = api.factSheet?.hourlyWage ?? null;
  const hourlyWage = ex.hourlyWage ?? derivedWage ?? 0;

  // 월 환산액: 월급제는 계약 월급 그대로. 시급제는 주휴 포함 월 소정유급시간으로
  // 추정 — 백엔드 역산 공식(주 15h 이상 시 주휴 1일분 가산, ×52/12)의 역방향.
  let estimatedMonthlyPay = ex.monthlyWage ?? 0;
  if (
    ex.monthlyWage == null &&
    hourlyWage > 0 &&
    ex.workingHoursPerDay != null &&
    ex.workingDaysPerWeek != null &&
    ex.workingDaysPerWeek > 0
  ) {
    const weeklyHours = ex.workingHoursPerDay * ex.workingDaysPerWeek;
    const weeklyPaidHours =
      weeklyHours >= 15 ? weeklyHours + ex.workingHoursPerDay : weeklyHours;
    estimatedMonthlyPay = Math.round((hourlyWage * weeklyPaidHours * 52) / 12);
  }

  return {
    contractId: api.contractId ?? null,
    workplaceName: ex.employerName ?? "",
    contractPeriod,
    hourlyWage,
    isDerivedHourlyWage: ex.hourlyWage == null && derivedWage != null,
    minimumWage: api.minimumWage ?? getMinimumWage().wage,
    estimatedMonthlyPay,
    issues,
    overallRisk,
    summary: api.summary ?? "",
    imageUrl: api.imageUrl ?? null,
    extracted: ex,
  };
}

/** @deprecated mapContractApiResponse를 사용하세요 */
export const mapApiResponseToContractResult = mapContractApiResponse;
