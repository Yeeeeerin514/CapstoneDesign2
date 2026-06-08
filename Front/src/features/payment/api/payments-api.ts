import { apiClient } from "@/shared/api/axios-instance";
import type { PaymentRecord, PaymentRecordStatus } from "../model/store";

interface ApiPayment {
  id: string;
  menteeId: string | null;
  mentorId: string;
  caseId: string;
  amount: number;
  status: string;
  createdAt: string;
  refundedAt: string | null;
}

function toRecord(a: ApiPayment): PaymentRecord {
  return {
    id: a.id,
    menteeId: a.menteeId ?? "",
    mentorId: a.mentorId,
    caseId: a.caseId,
    amount: a.amount,
    status: a.status as PaymentRecordStatus,
    createdAt: a.createdAt,
    refundedAt: a.refundedAt ?? undefined,
  };
}

/** POST /api/payments — mock 결제 성공 후 기록 영속. */
export async function createPayment(input: {
  mentorId: string;
  caseId: string;
  amount: number;
}): Promise<PaymentRecord> {
  const { data } = await apiClient.post<ApiPayment>("/payments", input);
  return toRecord(data);
}

/**
 * POST /api/payments/{id}/settle
 *  body: { outcome: "RESOLVED" | "UNRESOLVED" }
 *
 * 백엔드는 outcome에 따라 에스크로(₩4,000)를 분배:
 *  - RESOLVED   → 멘토 추가 지급 (status: settled_resolved)
 *  - UNRESOLVED → 멘티 환급      (status: settled_unresolved)
 *
 * 백엔드 미구현 상태에선 axios 호출이 실패하므로 store에서 graceful fallback.
 */
export async function settlePayment(
  id: string,
  outcome: "RESOLVED" | "UNRESOLVED",
): Promise<PaymentRecord> {
  const { data } = await apiClient.post<ApiPayment>(
    `/payments/${id}/settle`,
    { outcome },
  );
  return toRecord(data);
}

/**
 * @deprecated 호환용. 내부적으로 settlePayment(id, "UNRESOLVED")와 동일.
 * 기존 코드(refundPayment)가 멘티 환급을 의미했기 때문에 UNRESOLVED 분기로 매핑.
 */
export async function refundPayment(id: string): Promise<PaymentRecord> {
  return settlePayment(id, "UNRESOLVED");
}

/** GET /api/payments/me — 내 결제 기록. */
export async function fetchMyPayments(): Promise<PaymentRecord[]> {
  const { data } = await apiClient.get<ApiPayment[]>("/payments/me");
  return data.map(toRecord);
}
