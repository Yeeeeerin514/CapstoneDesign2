export interface PaymentResult {
  success: boolean;
  paymentId: string;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  refundedAmount: number;
}

export interface PaymentProvider {
  name: "mock" | "kakaopay" | "toss";
  charge(params: {
    userId: string;
    amount: number;
    itemName: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentResult>;
  refund(params: {
    paymentId: string;
    amount: number;
  }): Promise<RefundResult>;
}

/**
 * 결제 금액 분배 (10,000원 결제 시).
 * - 멘토 수령: 5,000원
 * - 플랫폼 수수료: 2,000원
 * - 멘티 환급(해결 후): 3,000원
 * 변경 시 이 상수만 수정.
 */
export const PAYMENT_DISTRIBUTION = {
  total: 10000,
  mentor: 5000,
  platform: 2000,
  menteeRefund: 3000,
} as const;
