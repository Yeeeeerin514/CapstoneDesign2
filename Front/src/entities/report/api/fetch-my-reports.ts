import { apiClient } from "@/shared/api/axios-instance";
import {
  INITIAL_EVIDENCE,
  type BusinessInfo,
  type CaseStep,
  type ComplaintFacts,
  type ComplaintRespondent,
  type DamageTypeEnum,
  type ReportCase,
  type ReportStatus,
} from "../model/types";

/**
 * GET /api/reports 응답 1건 — 백엔드 ReportSummaryResponse와 1:1.
 * 목록 카드에 필요한 최소 정보만 담겨 온다(상세는 단건 조회).
 */
interface ReportSummaryResponse {
  caseId: number;
  status: ReportStatus;
  currentStep: CaseStep;
  createdAt: string | null;
  workplaceName: string | null;
  damageTypes: string[];
  totalUnpaidWage: number | null;
}

/**
 * GET /api/reports/{caseId} 응답 — 백엔드 ReportDetailResponse와 1:1.
 * business / respondent / facts는 백엔드 임베디드 필드명이 프론트 타입과 일치해 그대로 직렬화된다.
 */
interface ReportDetailResponse {
  caseId: number;
  source: "search" | "registered" | "manual";
  status: ReportStatus;
  currentStep: CaseStep;
  createdAt: string | null;
  business: BusinessInfo | null;
  damageTypes: string[];
  freeFormDescription: string | null;
  respondent: ComplaintRespondent | null;
  facts: ComplaintFacts | null;
}

/**
 * 서버 응답을 ReportCase로 변환하는 공통 기본값.
 * 서버가 주지 않는 클라이언트 전용 필드(evidence/계산값 등)는 빈 초기값으로 채운다.
 * highestStep은 서버 currentStep과 동일하게 시작(서버가 최고 단계를 별도 관리하지 않으므로).
 */
function baseCase(
  caseId: number,
  status: ReportStatus,
  currentStep: CaseStep,
  createdAt: string | null,
  workplaceName: string,
): Omit<ReportCase, "business" | "respondent" | "facts"> {
  return {
    id: String(caseId),
    workplaceName,
    businessRegistrationNumber: null,
    businessId: null,
    industry: "",
    region: "",
    damageTypes: [],
    status,
    currentStep,
    highestStep: currentStep,
    completedSteps: [],
    evidence: { ...INITIAL_EVIDENCE },
    evidenceFiles: [],
    evidenceTexts: [],
    calculatedWageOwed: null,
    calculatedPaidAmount: null,
    calculatedUnpaid: null,
    wageBreakdown: null,
    hourlyWage: null,
    actualReceivedAmount: null,
    manualUnpaidAmount: null,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

/** 목록 요약 → ReportCase (카드 표시에 필요한 최소 정보). */
function summaryToCase(r: ReportSummaryResponse): ReportCase {
  return {
    ...baseCase(
      r.caseId,
      r.status,
      r.currentStep,
      r.createdAt,
      r.workplaceName ?? "사업장 미상",
    ),
    damageTypeEnums: r.damageTypes as DamageTypeEnum[],
    freeFormDescription: "",
    facts:
      r.totalUnpaidWage !== null
        ? ({ totalUnpaidWage: r.totalUnpaidWage } as ComplaintFacts)
        : undefined,
  };
}

/** 단건 상세 → ReportCase (evidence 단계에서 저장한 모든 입력 포함). */
function detailToCase(r: ReportDetailResponse): ReportCase {
  const workplaceName =
    r.business?.name ?? r.respondent?.workplaceName ?? "사업장 미상";
  return {
    ...baseCase(r.caseId, r.status, r.currentStep, r.createdAt, workplaceName),
    businessRegistrationNumber: r.business?.registrationNumber ?? null,
    industry: r.business?.category ?? "",
    business: r.business ?? undefined,
    draftSource: r.source,
    damageTypeEnums: r.damageTypes as DamageTypeEnum[],
    freeFormDescription: r.freeFormDescription ?? "",
    respondent: r.respondent ?? undefined,
    facts: r.facts ?? undefined,
  };
}

/** 인증 사용자의 신고 사건 목록(최신순). 서버 DB가 진실의 원천. */
export async function fetchMyReports(): Promise<ReportCase[]> {
  const { data } = await apiClient.get<ReportSummaryResponse[]>("/reports");
  return data.map(summaryToCase);
}

/** 단건 상세 조회 — evidence 단계 입력까지 포함한 전체 사건. */
export async function fetchReportDetail(caseId: string): Promise<ReportCase> {
  const { data } = await apiClient.get<ReportDetailResponse>(
    `/reports/${caseId}`,
  );
  return detailToCase(data);
}
