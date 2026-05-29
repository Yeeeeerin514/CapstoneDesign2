import { apiClient } from "@/shared/api/axios-instance";
import type { Report } from "../model/types";

interface BackendReport {
  id: number;
  businessName: string | null;
  businessRegistrationNumber: string | null;
  violationType: string | null;
  unpaidAmount: number | null;
  description: string | null;
  evidenceImageUrl: string | null;
  complaintDraft: string | null;
  complaintPdfUrl: string | null;
  status: string | null;
  createdAt: string | null;
  hasCollectiveActionPartners: boolean;
}

function toReport(r: BackendReport): Report {
  return {
    id: String(r.id),
    workplaceId: "",
    workplaceName: r.businessName ?? "사업장 미상",
    estimatedUnpaidAmount: r.unpaidAmount ?? 0,
    status: (r.status === "SUBMITTED" ? "submitted"
      : r.status === "RESOLVED" ? "resolved"
      : "draft") as Report["status"],
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
  description?: string;
  hourlyWage?: number | null;
  violationType?: string;
  /** 실제 수령액 — 사용자 입력. */
  actualReceivedAmount?: number | null;
  /** 사용자가 breakdown 편집 후 저장한 미지급 총액. */
  manualUnpaidAmount?: number | null;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const { data } = await apiClient.post<BackendReport>("/reports", {
    partTimeJobId: Number(input.workplaceId),
    businessName: input.businessName ?? "미입력",
    description: input.description ?? "신고 내용을 입력해주세요.",
    violationType: input.violationType ?? "MINIMUM_WAGE",
    hourlyWage: input.hourlyWage ?? null,
    actualReceivedAmount: input.actualReceivedAmount ?? null,
    manualUnpaidAmount: input.manualUnpaidAmount ?? null,
  });
  return toReport(data);
}

export async function generateReportDraft(reportId: string): Promise<{ pdfUrl: string }> {
  const { data } = await apiClient.post<{ complaintDraft: string }>(
    `/reports/${reportId}/complaint-draft`,
  );
  return { pdfUrl: data.complaintDraft ?? "" };
}
