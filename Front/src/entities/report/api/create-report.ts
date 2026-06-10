import { apiClient } from "@/shared/api/axios-instance";
import type { Report, ReportStatus } from "../model/types";
import type { WageBreakdown } from "./wage-calc";

/**
 * POST/GET /api/reports 응답 — API-REFERENCE.md §5 ReportResponse 캐논.
 */
export interface BackendReport {
  id: number;
  businessName: string | null;
  businessRegistrationNumber: string | null;
  violationType: string | null;
  unpaidAmount: number | null;
  description: string | null;
  evidenceImageUrl: string | null;
  complaintDraft: string | null;
  complaintPdfUrl: string | null;
  status: ReportStatus;
  createdAt: string | null;
  hasCollectiveActionPartners: boolean;
  /** 신고 생성 시 백엔드가 계산해 응답에 포함. null 가능. */
  wageBreakdown: WageBreakdown | null;
  /** 같은 사업장 신고자(공동대응 후보) 목록 — 추후 타입 정의. */
  collectiveActionCandidates: unknown[];
}

function toReport(r: BackendReport): Report {
  return {
    id: String(r.id),
    workplaceId: "",
    workplaceName: r.businessName ?? "사업장 미상",
    estimatedUnpaidAmount: r.unpaidAmount ?? 0,
    status: (r.status === "RESOLVED" ? "resolved"
      : r.status === "PENDING" ? "draft"
      : "submitted") as Report["status"],
    evidences: [],
    isSolidarity: r.hasCollectiveActionPartners,
    participantCount: r.hasCollectiveActionPartners ? 2 : 1,
    createdAt: r.createdAt ?? new Date().toISOString(),
  };
}

export async function fetchReports(): Promise<Report[]> {
  const { data } = await apiClient.get<BackendReport[]>("/reports");
  return data.map(toReport);
}

export async function fetchReport(id: string): Promise<Report> {
  const { data } = await apiClient.get<BackendReport>(`/reports/${id}`);
  return toReport(data);
}

export interface CreateReportInput {
  workplaceId: string;
  businessName?: string;
  /** 사업자등록번호 (선택). 신고 후 자동 조회에 사용. */
  businessRegistrationNumber?: string | null;
  /** 백엔드 business 테이블 ID (선택). 사업장 검색 연결 시. */
  businessId?: number | null;
  description?: string;
  hourlyWage?: number | null;
  violationType?: string;
  /** 실제 수령액 — 사용자 입력. */
  actualReceivedAmount?: number | null;
  /** 사용자가 breakdown 편집 후 저장한 미지급 총액. */
  manualUnpaidAmount?: number | null;
}

/**
 * 신고 생성 — 응답에 wageBreakdown / collectiveActionCandidates 포함.
 * 호출처가 BackendReport 그대로 받아 toReport 매핑 또는 wageBreakdown 직접 활용 선택.
 */
export async function createReport(input: CreateReportInput): Promise<BackendReport> {
  const { data } = await apiClient.post<BackendReport>("/reports", {
    partTimeJobId: Number(input.workplaceId),
    businessRegistrationNumber: input.businessRegistrationNumber ?? null,
    businessId: input.businessId ?? null,
    businessName: input.businessName ?? "미입력",
    description: input.description ?? "신고 내용을 입력해주세요.",
    violationType: input.violationType ?? "MINIMUM_WAGE",
    hourlyWage: input.hourlyWage ?? null,
    actualReceivedAmount: input.actualReceivedAmount ?? null,
    manualUnpaidAmount: input.manualUnpaidAmount ?? null,
    evidenceImageUrl: null,
  });
  return data;
}

/**
 * POST /api/reports/{caseId}/complaint-draft — Gemini가 생성한 진정 내용 본문(줄글) 반환.
 * caseId는 백엔드 사건 id여야 함(사업장 검색으로 시작한 신고). 클라이언트 id면 서버가 거부.
 *
 * negotiationStatus(선택): "사업주와 협의 시도하셨나요?" 선택 키("refused"|"not-tried"|"no-response").
 * 서버가 이를 사실 서술로 바꿔 AI가 격식체로 다시 풀어 쓴다(프론트 안내 문구 그대로 들어가지 않음).
 */
export async function generateReportDraft(
  reportId: string,
  negotiationStatus?: string,
): Promise<string> {
  const { data } = await apiClient.post<{ complaintDraft: string }>(
    `/reports/${reportId}/complaint-draft`,
    negotiationStatus !== undefined ? { negotiationStatus } : undefined,
  );
  return data.complaintDraft ?? "";
}
