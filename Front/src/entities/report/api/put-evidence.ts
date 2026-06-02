import { apiClient } from "@/shared/api/axios-instance";
import type {
  ComplaintFacts,
  ComplaintRespondent,
  DamageTypeEnum,
} from "../model/types";

/**
 * `PUT /api/reports/{caseId}/evidence` 요청 본문.
 * 백엔드 통신 문서(2026-05-30) §2.3.
 *
 * 진정인(applicant) 정보는 절대 전송하지 않음 — 프론트 로컬 + PDF only.
 */
export interface PutEvidenceRequest {
  damageTypes: DamageTypeEnum[];
  freeFormDescription: string;
  respondent: ComplaintRespondent;
  facts: ComplaintFacts;
}

/**
 * 1단계 증거 수집 저장. 멱등(idempotent) — 같은 페이로드 여러 번 PUT 가능.
 * 부분 저장 케이스를 위해 facts 내부 필드는 모두 nullable.
 */
export async function putReportEvidence(
  caseId: string | number,
  body: PutEvidenceRequest,
): Promise<void> {
  await apiClient.put(`/reports/${caseId}/evidence`, body);
}
