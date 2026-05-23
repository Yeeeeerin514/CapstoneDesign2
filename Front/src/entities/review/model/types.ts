export interface ResolveReviewTips {
  complaint: string;
  investigation: string;
  negotiation: string;
}

export interface ResolveReview {
  id: string;
  authorNickname: string;
  authorBadges: string[];
  industry: string;
  region: string;
  damageType: string;
  /** 피해 금액 구간 표시 (예: "100만원대"). */
  unpaidAmountRange: string;
  resolveDays: number;
  /** 별점 (1~5). */
  rating: number;
  title: string;
  content: string;
  tips: ResolveReviewTips;
  helpfulCount: number;
  /** 작성자가 멘토 등록한 경우 true. */
  isMentor: boolean;
  mentorUserId: string | null;
  createdAt: string;
}
