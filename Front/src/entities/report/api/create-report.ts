import { apiClient } from "@/shared/api/axios-instance";
import type { Report } from "../model/types";

export async function fetchReports(): Promise<Report[]> {
  const { data } = await apiClient.get<Report[]>("/reports");
  return data;
}

export async function fetchReport(id: string): Promise<Report> {
  const { data } = await apiClient.get<Report>(`/reports/${id}`);
  return data;
}

export async function createReport(workplaceId: string): Promise<Report> {
  const { data } = await apiClient.post<Report>("/reports", { workplaceId });
  return data;
}

/** 진정서 PDF 초안 생성 (Claude AI로 본문 작성 → PDF). */
export async function generateReportDraft(
  reportId: string,
): Promise<{ pdfUrl: string }> {
  const { data } = await apiClient.post<{ pdfUrl: string }>(
    `/reports/${reportId}/draft`,
  );
  return data;
}
