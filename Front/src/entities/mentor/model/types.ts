export type MentorBadge = "인증멘토" | "공동대응대표" | "빠른해결";

export interface MentorProfile {
  userId: string;
  nickname: string;
  /** 증빙서류(시정지시서/입금내역) 업로드 여부. */
  isVerified: boolean;
  /** 공동대응 대표자 이력 보유 여부. */
  wasGroupLeader: boolean;
  /** 후기 별점 평균 (1.0 ~ 5.0). */
  averageRating: number;
  reviewCount: number;
  /** 평균 해결 소요일. */
  resolvedDays: number;
  /** 업종 (카페·음식점, 편의점, 배달 등). */
  industry: string;
  /** 경험한 피해 유형 (임금체불, 주휴수당, 연장수당 등). */
  damageTypes: string[];
  /** 1회 상담료(원). 기본 10,000. */
  consultingFee: number;
  /** 매칭 가중치 점수 — calcMentorScore로 계산. */
  score: number;
  badges: MentorBadge[];
  /** 한 줄 소개. */
  bio: string;
}

/**
 * 멘토 매칭 가중치 점수.
 * - 공동대응 대표자 이력: +30
 * - 증빙서류 업로드: +20
 * - 별점 평균 × 10
 * - 해결 소요일 역비례 (50 - days, 최저 0)
 */
export function calcMentorScore(profile: Omit<MentorProfile, "score">): number {
  let score = 0;
  if (profile.wasGroupLeader) score += 30;
  if (profile.isVerified) score += 20;
  score += profile.averageRating * 10;
  score += Math.max(0, 50 - profile.resolvedDays);
  return Math.round(score);
}

/**
 * 1:1 멘토링 매칭 기록 — 결제 완료 후 영구 보존.
 * 사건 상세 "연결된 멘토" 카드 / MY 탭 "내 멘토링" 목록 / 채팅방 진입 단일 출처.
 * Phase A: 채팅 메시지를 매칭 레코드 안에 인메모리 저장. Phase B에서 서버로 분리.
 */
export interface MentorChatMessage {
  id: string;
  senderId: string;
  senderRole: "mentor" | "mentee" | "system";
  text: string;
  /** ISO date string. */
  timestamp: string;
}

export type MentorMatchStatus = "active" | "completed" | "cancelled";

export interface MentorMatch {
  id: string;
  caseId: string;
  menteeId: string;
  mentorId: string;
  mentorNickname: string;
  mentorBadges: MentorBadge[];
  mentorIndustry: string;
  matchedAt: string;
  status: MentorMatchStatus;
  /** 마지막 메시지 시각 — 목록 정렬용. 없으면 matchedAt 사용. */
  lastMessageAt?: string;
  /** 목록 카드에 노출할 메시지 30자 prefix. */
  lastMessagePreview?: string;
  chatMessages: MentorChatMessage[];
  /** 백엔드 mentorship_match.id — 피드백 제출 시 사용. SmartMentor 매칭만 보유. */
  backendMatchId?: number;
  /** 피드백 제출 여부 — 중복 평가 방지. */
  feedbackSubmitted?: boolean;
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
