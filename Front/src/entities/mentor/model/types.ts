export type MentorBadge = "인증멘토" | "빠른해결";

export interface MentorProfile {
  userId: string;
  nickname: string;
  /** 증빙서류(시정지시서/입금내역) 업로드 여부. */
  isVerified: boolean;
  /**
   * V2 — 공동대응 기능 제거됨. 기존 mock 데이터/API 호환을 위해 필드만 보존.
   * 항상 false. 점수 계산/UI에서 분기 없음.
   */
  wasGroupLeader: boolean;
  /** 후기 별점 평균 (1.0 ~ 5.0). */
  averageRating: number;
  reviewCount: number;
  /** 평균 해결 소요일. */
  resolvedDays: number;
  /** 업종 (카페·음식점, 편의점, 배달 등). */
  industry: string;
  /** 활동 지역 (시·도 단위). 검색 필터 매칭용. */
  region?: string;
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
 * - 증빙서류 업로드: +20
 * - 별점 평균 × 10
 * - 해결 소요일 역비례 (50 - days, 최저 0)
 *
 * V2 — 공동대응 가산점(wasGroupLeader +30) 제거됨.
 */
export function calcMentorScore(profile: Omit<MentorProfile, "score">): number {
  let score = 0;
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
  /**
   * 백엔드 chat_message.id — 폴링으로 수신했거나 전송 성공한 메시지에만 존재.
   * 로컬 전용(system/intro/전송실패 fallback)은 undefined.
   * 채팅 재진입·폴링 경합 시 중복 추가를 막는 dedup 키.
   */
  backendId?: number;
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
