import { apiClient } from "@/shared/api/axios-instance";
import type {
  BusinessInfo,
  CaseStep,
  ReportStatus,
} from "../model/types";

/**
 * `POST /api/reports/draft` 요청 본문.
 * 백엔드 통신 문서(2026-05-30) §2.2.
 * source에 따라 한 가지 path만 채워서 전송 — 나머지 키는 omit.
 */
export type CreateReportDraftRequest =
  | {
      source: "search";
      businessRegistrationNumber: string;
      businessName: string;
      businessCategory: string | null;
      businessAddress: string | null;
      businessPhone: string | null;
      representativeName: string | null;
      laborOffice: string | null;
    }
  | {
      source: "registered";
      partTimeJobId: number;
    }
  | {
      source: "manual";
      businessName: string;
      businessRegistrationNumber: string | null;
      businessAddress: string | null;
    };

export interface CreateReportDraftResponse {
  caseId: number;
  status: ReportStatus;
  currentStep: CaseStep;
  createdAt: string;
  business: BusinessInfo;
}

/**
 * 신고 사건 draft 생성. 단계 진행 없이 "그릇"만 만듦.
 * 이후 1단계 데이터는 PUT /reports/{caseId}/evidence 로 채움.
 */
export async function createReportDraft(
  body: CreateReportDraftRequest,
): Promise<CreateReportDraftResponse> {
  const { data } = await apiClient.post<CreateReportDraftResponse>(
    "/reports/draft",
    body,
  );
  return data;
}
