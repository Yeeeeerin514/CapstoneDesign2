import type { PaymentProvider } from "./types";

export const mockPaymentProvider: PaymentProvider = {
  name: "mock",

  charge: async ({ amount, itemName }) => {
    // 결제 처리 시뮬레이션 (1.5초 딜레이)
    await new Promise<void>((r) => setTimeout(r, 1500));
    console.log(`[MockPayment] 결제 완료: ${itemName} ₩${amount}`);
    return {
      success: true,
      paymentId: `mock_${Date.now()}`,
    };
  },

  refund: async ({ paymentId, amount }) => {
    await new Promise<void>((r) => setTimeout(r, 800));
    console.log(`[MockPayment] 환급 완료: ${paymentId} ₩${amount}`);
    return {
      success: true,
      refundId: `mock_refund_${Date.now()}`,
      refundedAmount: amount,
    };
  },
};
