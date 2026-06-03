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

/** POST /api/payments/{id}/refund — 사건 해결 후 부분 환급. */
export async function refundPayment(id: string): Promise<PaymentRecord> {
  const { data } = await apiClient.post<ApiPayment>(`/payments/${id}/refund`);
  return toRecord(data);
}

/** GET /api/payments/me — 내 결제 기록. */
export async function fetchMyPayments(): Promise<PaymentRecord[]> {
  const { data } = await apiClient.get<ApiPayment[]>("/payments/me");
  return data.map(toRecord);
}
