import { create } from "zustand";
import { paymentProvider, PAYMENT_DISTRIBUTION } from "@/shared/lib/payment";

export type PaymentRecordStatus =
  | "paid"
  | "refunded_partial"
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

  chargeMentorFee: (params: {
    menteeId: string;
    mentorId: string;
    caseId: string;
  }) => Promise<ChargeResult>;

  /** 사건 해결 후 멘티에게 일부 환급 (PAYMENT_DISTRIBUTION.menteeRefund). */
  refundAfterResolved: (paymentId: string) => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  records: [],
  isLoading: false,
  error: null,

  chargeMentorFee: async ({ menteeId, mentorId, caseId }) => {
    set({ isLoading: true, error: null });
    try {
      const result = await paymentProvider.charge({
        userId: menteeId,
        amount: PAYMENT_DISTRIBUTION.total,
        itemName: "멘토 매칭",
        metadata: { mentorId, caseId },
      });
      if (result.success) {
        const record: PaymentRecord = {
          id: result.paymentId,
          menteeId,
          mentorId,
          caseId,
          amount: PAYMENT_DISTRIBUTION.total,
          status: "paid",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ records: [...state.records, record] }));
      }
      return { success: result.success, paymentId: result.paymentId };
    } catch {
      set({ error: "결제 중 오류가 발생했습니다." });
      return { success: false };
    } finally {
      set({ isLoading: false });
    }
  },

  refundAfterResolved: async (paymentId) => {
    const refundAmount = PAYMENT_DISTRIBUTION.menteeRefund;
    await paymentProvider.refund({ paymentId, amount: refundAmount });
    set((state) => ({
      records: state.records.map((r) =>
        r.id === paymentId
          ? {
              ...r,
              status: "refunded_partial",
              refundedAt: new Date().toISOString(),
            }
          : r,
      ),
    }));
  },
}));
