export interface ResolveReviewTips {
  complaint: string;
  investigation: string;
  negotiation: string;
}

/** 임금체불 세부 유형 — UI 배지/필터에 사용. */
export type DamageTypeLabel =
  | "임금(기본급) 미지급"
  | "주휴수당 미지급"
  | "연장근로수당 미지급"
  | "야간근로수당 미지급"
  | "퇴직금 미지급";

/** 해결 방법 — 사건 진행 흐름. */
export type ResolutionMethodLabel =
  | "노동청 진정"
  | "민사 소송"
  | "지급명령"
  | "합의"
  | "노무사 상담";

export interface ResolveReview {
  id: string;
  authorNickname: string;
  authorBadges: string[];
  industry: string;
  region: string;
  /** 세부 유형 라벨(중복 선택) — 카드 배지/필터에 그대로 표시. */
  damageTypes: DamageTypeLabel[];
  /** 해결 방법 — 카드에 "노동청 진정 · N일 만에 해결" 형태로 노출. */
  resolutionMethod: ResolutionMethodLabel;
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
