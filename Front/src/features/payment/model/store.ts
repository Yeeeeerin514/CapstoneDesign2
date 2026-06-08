import { create } from "zustand";
import { paymentProvider, PAYMENT_DISTRIBUTION } from "@/shared/lib/payment";
import {
  createPayment,
  fetchMyPayments,
  settlePayment,
} from "../api/payments-api";

export type PaymentRecordStatus =
  | "paid"
  | "settled_resolved"
  | "settled_unresolved"
  /** @deprecated 레거시 호환용. */
  | "refunded_partial"
  /** @deprecated 레거시 호환용. */
  | "refunded_full";

export interface PaymentRecord {
  id: string;
  menteeId: string;
  mentorId: string;
  caseId: string;
  amount: number;
  status: PaymentRecordStatus;
  createdAt: string;
  refundedAt?: string;
}

interface ChargeResult {
  success: boolean;
  paymentId?: string;
}

interface PaymentState {
  records: PaymentRecord[];
  isLoading: boolean;
  error: string | null;

  /** 내 결제 기록을 백엔드에서 로드. */
  load: () => Promise<void>;

  chargeMentorFee: (params: {
    menteeId: string;
    mentorId: string;
    caseId: string;
  }) => Promise<ChargeResult>;

  /**
   * 사건 RESOLVED — 에스크로(₩4,000)를 멘토에게 성과보수로 추가 지급.
   * 결제 status: paid → settled_resolved.
   */
  settleOnResolved: (paymentId: string) => Promise<void>;

  /**
   * 사건 UNRESOLVED — 에스크로(₩4,000)를 멘티에게 환급.
   * 결제 status: paid → settled_unresolved.
   */
  settleOnUnresolved: (paymentId: string) => Promise<void>;

  /** @deprecated 호환용. settleOnUnresolved와 동일 (기존 ResolveConfirmView 흐름). */
  refundAfterResolved: (paymentId: string) => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  records: [],
  isLoading: false,
  error: null,

  load: async () => {
    try {
      const data = await fetchMyPayments();
      set({ records: data });
    } catch {
      // 미로그인/네트워크 실패 시 기존 기록 유지
    }
  },

  chargeMentorFee: async ({ menteeId, mentorId, caseId }) => {
    set({ isLoading: true, error: null });
    try {
      // 1) 실제 PG 는 mock provider (카드 처리 시뮬레이션)
      const result = await paymentProvider.charge({
        userId: menteeId,
        amount: PAYMENT_DISTRIBUTION.total,
        itemName: "멘토 매칭",
        metadata: { mentorId, caseId },
      });
      if (!result.success) {
        return { success: false, paymentId: result.paymentId };
      }
      // 2) 결제 기록을 백엔드에 영속
      try {
        const saved = await createPayment({
          mentorId,
          caseId,
          amount: PAYMENT_DISTRIBUTION.total,
        });
        set((state) => ({ records: [...state.records, saved] }));
        return { success: true, paymentId: saved.id };
      } catch {
        // 백엔드 영속 실패 → 로컬 기록만 (UI 끊김 방지)
        const local: PaymentRecord = {
          id: result.paymentId,
          menteeId,
          mentorId,
          caseId,
          amount: PAYMENT_DISTRIBUTION.total,
          status: "paid",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ records: [...state.records, local] }));
        return { success: true, paymentId: result.paymentId };
      }
    } catch {
      set({ error: "결제 중 오류가 발생했습니다." });
      return { success: false };
    } finally {
      set({ isLoading: false });
    }
  },

  settleOnResolved: async (paymentId) => {
    // 1) mock PG — 멘토 추가 지급 (환급 API를 mock 멘토 보너스로 재사용)
    await paymentProvider.refund({
      paymentId,
      amount: PAYMENT_DISTRIBUTION.mentorBonus,
    });
    // 2) 백엔드 반영
    try {
      const updated = await settlePayment(paymentId, "RESOLVED");
      set((state) => ({
        records: state.records.map((r) => (r.id === paymentId ? updated : r)),
      }));
    } catch {
      set((state) => ({
        records: state.records.map((r) =>
          r.id === paymentId
            ? {
                ...r,
                status: "settled_resolved",
                refundedAt: new Date().toISOString(),
              }
            : r,
        ),
      }));
    }
  },

  settleOnUnresolved: async (paymentId) => {
    // 1) mock PG — 멘티 환급
    await paymentProvider.refund({
      paymentId,
      amount: PAYMENT_DISTRIBUTION.menteeRefund,
    });
    // 2) 백엔드 반영
    try {
      const updated = await settlePayment(paymentId, "UNRESOLVED");
      set((state) => ({
        records: state.records.map((r) => (r.id === paymentId ? updated : r)),
      }));
    } catch {
      set((state) => ({
        records: state.records.map((r) =>
          r.id === paymentId
            ? {
                ...r,
                status: "settled_unresolved",
                refundedAt: new Date().toISOString(),
              }
            : r,
        ),
      }));
    }
  },

  refundAfterResolved: async (paymentId) => {
    // 호환 alias — 기존 호출자(ResolveConfirmView legacy)는 UNRESOLVED 경로로.
    await usePaymentStore.getState().settleOnUnresolved(paymentId);
  },
}));
