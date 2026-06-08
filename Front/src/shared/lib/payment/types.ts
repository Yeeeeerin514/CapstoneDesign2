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
 *  - 멘토 즉시 수령: 6,000원 (보장된 매칭 보수)
 *  - 에스크로 보관: 4,000원
 *      · 사건 해결됨(RESOLVED) → 멘토에게 추가 지급 (성과보수)
 *      · 미해결 종결(UNRESOLVED) → 멘티에게 환급
 * 플랫폼 수수료는 별도 없음 (수익 모델 결정 시 platform 필드 부활).
 * 변경 시 이 상수만 수정.
 */
export const PAYMENT_DISTRIBUTION = {
  total: 10000,
  /** 매칭 시점 멘토 즉시 지급. */
  mentor: 6000,
  /** 결과에 따라 멘토 추가 지급(해결) 또는 멘티 환급(미해결)되는 금액. */
  escrow: 4000,
  /** 사건 RESOLVED 시 멘토에게 추가 지급되는 성과보수 (=escrow). */
  mentorBonus: 4000,
  /** 사건 UNRESOLVED 시 멘티에게 환급되는 금액 (=escrow). */
  menteeRefund: 4000,
  /** @deprecated 분배 모델에서 제외됨 (호환을 위해 0). */
  platform: 0,
} as const;
