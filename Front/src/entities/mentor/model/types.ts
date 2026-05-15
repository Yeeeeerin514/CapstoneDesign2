export interface MentorProfile {
  id: string;
  userId: string;
  nickname: string;
  /** 업종 (예: 편의점, 카페, 음식점). */
  industries: string[];
  /** 해결 사례 수. */
  resolvedCases: number;
  /** 별점 (0~5). */
  rating: number;
  /** 1회 상담료 (원). */
  consultingFee: number;
  /** 멘티 사례와의 AI 유사도 (0~100). 추천 목록에서만 채워짐. */
  similarity?: number;
}

export type EscrowStatus = "pending" | "paid" | "released" | "refunded";

export interface EscrowOrder {
  id: string;
  mentorId: string;
  amount: number;
  /** 해결 시 예상 회수 금액 (원). */
  estimatedRecoveryAmount: number;
  status: EscrowStatus;
  /** ISO 생성 시각. */
  createdAt: string;
}
