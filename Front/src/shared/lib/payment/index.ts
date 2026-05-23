import { env } from "@/shared/config/env";
import { mockPaymentProvider } from "./mockProvider";
import type { PaymentProvider } from "./types";

/**
 * 활성 결제 provider — env.paymentProvider로 전환.
 * 실제 결제 연결 시 case 분기에 toss/kakaoPay provider 등록.
 */
export const paymentProvider: PaymentProvider = (() => {
  switch (env.paymentProvider) {
    case "mock":
      return mockPaymentProvider;
    // case "toss": return tossProvider;
    // case "kakaopay": return kakaoPayProvider;
    default:
      return mockPaymentProvider;
  }
})();

export { PAYMENT_DISTRIBUTION } from "./types";
export type {
  PaymentProvider,
  PaymentResult,
  RefundResult,
} from "./types";
