/**
 * Phase 1 — 백엔드 매칭 시스템 (Gower + Gale-Shapley + Thompson Sampling) 타입.
 *
 * 기존 MentorProfile/MentorMatch는 mock 기반 프론트 전용 모델이라 호환 유지.
 * 이 파일은 새 백엔드 API 응답을 그대로 받아 화면에 표시하는 모델.
 */

// 백엔드 enum과 1:1 매핑 (UI 라벨은 백엔드가 label() 메서드로 제공하지만
// 폼에서 선택 시에는 enum value를 그대로 보냄)
export type Industry =
  | "FOOD_SERVICE" | "DELIVERY" | "CONVENIENCE_RETAIL" | "MANUFACTURING"
  | "OFFICE" | "CONSTRUCTION" | "SERVICE" | "EDUCATION" | "HEALTHCARE" | "OTHER";

export type DamageType =
  | "WAGE_ARREARS" | "SEVERANCE_PAY" | "WEEKLY_HOLIDAY" | "OVERTIME_PAY"
  | "INSURANCE" | "UNFAIR_DISMISSAL" | "INDUSTRIAL_ACCIDENT" | "UNPAID_BONUS"
  | "CONTRACT_BREACH" | "OTHER";

export type EmploymentType =
  | "SHORT_TERM_PART_TIME" | "LONG_TERM_PART_TIME" | "DAILY_WORKER"
  | "CONTRACT" | "FREELANCE" | "REGULAR" | "OTHER";

export type BusinessSize = "UNDER_5" | "SIZE_5_TO_30" | "OVER_30" | "UNKNOWN";

export type Region =
  | "SEOUL" | "BUSAN" | "DAEGU" | "INCHEON" | "GWANGJU" | "DAEJEON" | "ULSAN"
  | "SEJONG" | "GYEONGGI" | "GANGWON" | "CHUNGBUK" | "CHUNGNAM" | "JEONBUK"
  | "JEONNAM" | "GYEONGBUK" | "GYEONGNAM" | "JEJU" | "OTHER";

export type ResolutionMethod =
  | "LABOR_OFFICE_REPORT" | "CIVIL_LAWSUIT" | "PAYMENT_ORDER"
  | "SETTLEMENT" | "LABOR_ATTORNEY" | "OTHER";

export type DamageAmountRange =
  | "UNDER_100K" | "KRW_100K_500K" | "KRW_500K_1M" | "KRW_1M_5M" | "OVER_5M";

// ─────────────────────────────────────────────────────────────────────
//  라벨 매핑 (UI 표시용)
// ─────────────────────────────────────────────────────────────────────

export const INDUSTRY_LABEL: Record<Industry, string> = {
  FOOD_SERVICE: "요식업",
  DELIVERY: "배달·물류",
  CONVENIENCE_RETAIL: "편의점·판매",
  MANUFACTURING: "제조",
  OFFICE: "사무·관리",
  CONSTRUCTION: "건설",
  SERVICE: "서비스",
  EDUCATION: "교육·강사",
  HEALTHCARE: "의료·돌봄",
  OTHER: "기타",
};

export const DAMAGE_TYPE_LABEL: Record<DamageType, string> = {
  WAGE_ARREARS: "임금체불",
  SEVERANCE_PAY: "퇴직금 미지급",
  WEEKLY_HOLIDAY: "주휴수당 미지급",
  OVERTIME_PAY: "연장·야간수당 미지급",
  INSURANCE: "4대보험 미가입",
  UNFAIR_DISMISSAL: "부당해고",
  INDUSTRIAL_ACCIDENT: "산재",
  UNPAID_BONUS: "상여금 미지급",
  CONTRACT_BREACH: "계약 위반",
  OTHER: "기타",
};

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  SHORT_TERM_PART_TIME: "단기알바",
  LONG_TERM_PART_TIME: "장기알바",
  DAILY_WORKER: "일용직",
  CONTRACT: "계약직",
  FREELANCE: "프리랜서",
  REGULAR: "정규직",
  OTHER: "기타",
};

export const BUSINESS_SIZE_LABEL: Record<BusinessSize, string> = {
  UNDER_5: "5인 미만",
  SIZE_5_TO_30: "5~30인",
  OVER_30: "30인 이상",
  UNKNOWN: "확인불가",
};

export const REGION_LABEL: Record<Region, string> = {
  SEOUL: "서울특별시", BUSAN: "부산광역시", DAEGU: "대구광역시",
  INCHEON: "인천광역시", GWANGJU: "광주광역시", DAEJEON: "대전광역시",
  ULSAN: "울산광역시", SEJONG: "세종특별자치시",
  GYEONGGI: "경기도", GANGWON: "강원특별자치도",
  CHUNGBUK: "충청북도", CHUNGNAM: "충청남도",
  JEONBUK: "전북특별자치도", JEONNAM: "전라남도",
  GYEONGBUK: "경상북도", GYEONGNAM: "경상남도",
  JEJU: "제주특별자치도", OTHER: "기타",
};

export const RESOLUTION_METHOD_LABEL: Record<ResolutionMethod, string> = {
  LABOR_OFFICE_REPORT: "노동청 진정",
  CIVIL_LAWSUIT: "민사소송",
  PAYMENT_ORDER: "지급명령",
  SETTLEMENT: "합의",
  LABOR_ATTORNEY: "노무사 상담",
  OTHER: "기타",
};

export const DAMAGE_AMOUNT_LABEL: Record<DamageAmountRange, string> = {
  UNDER_100K: "10만원 이하",
  KRW_100K_500K: "10~50만원",
  KRW_500K_1M: "50~100만원",
  KRW_1M_5M: "100~500만원",
  OVER_5M: "500만원 이상",
};

// ─────────────────────────────────────────────────────────────────────
//  API request/response 타입
// ─────────────────────────────────────────────────────────────────────

export type VerificationMethod = "RESOLVED_CASE" | "EVIDENCE_UPLOAD" | "ADMIN_VERIFIED";

/** 백엔드 mentorship_match.status 컬럼 enum. */
export type MatchStatus = "PROPOSED" | "ACTIVE" | "COMPLETED" | "CANCELED";

/** POST /api/mentoring/match-request 요청 본문. */
export interface MatchRequestPayload {
  caseId: number;
  industry: Industry;
  damageTypes: DamageType[];
  employmentType: EmploymentType;
  businessSize: BusinessSize;
  region: Region;
  damageAmountRange: DamageAmountRange;
  description: string;
  topK?: number;
}

export interface MatchContribution {
  damageTypes?: number;
  industry?: number;
  businessSize?: number;
  employmentType?: number;
  damageAmountRange?: number;
  region?: number;
  resolutionMethods?: number;
}

export interface MatchRecommendation {
  matchId: number;
  mentorProfileId: number;
  mentorUserId: number;
  mentorNickname: string;
  industry: string | null;       // 백엔드가 label로 변환해 보냄
  damageTypes: string[];
  businessSize: string | null;
  region: string | null;
  resolutionMethods: string[];
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  consultingFee: number;
  bio: string | null;
  matchScore: number;            // 0~1 (앙상블 최종)
  ruleBasedScore?: number | null; // Gower 점수 (앙상블 분해 시각화용)
  neuralScore?: number | null;    // Two-tower 점수 (가용 시)
  collaborativeScore?: number | null; // 협업 필터링(콜드스타트) 점수 (유사 멘티 피드백 있을 때)
  contributions: MatchContribution;
  matchReasons: string[];
  rank: number;                   // 1-based
}

export interface MatchResponseEnvelope {
  requestId: number;
  recommendations: MatchRecommendation[];
  weights: Record<string, number>;
  algorithm: string;
}

/**
 * GET /api/mentoring/my-matches 응답 단일 엔트리.
 * API-REFERENCE.md §7 MentorshipMatch.
 * MatchRecommendation과 유사하나 status·matchReasons·neural/rule score 모두 non-nullable.
 */
export interface MentorshipMatch {
  matchId: number;
  mentorProfileId: number;
  mentorUserId: number;
  mentorNickname: string;
  industry: string;
  damageTypes: string[];
  businessSize: string;
  region: string;
  resolutionMethods: string[];
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  consultingFee: number;
  bio: string;
  matchScore: number;
  ruleBasedScore: number;
  neuralScore: number;
  contributions: Record<string, number>;
  matchReasons: string[];
  rank: number;
  status: MatchStatus;
}

/**
 * GET /api/mentoring/my-mentor-matches 응답 항목.
 * 로그인한 멘토가 "본인이 멘토로 매칭된" 상담들을 받는 인박스 카드.
 * 멘티 실명은 비공개라 menteeLabel + 상담 맥락(업종·피해유형·요청 설명)으로 구분.
 */
export interface MentorInboxMatch {
  matchId: number;
  status: MatchStatus; // ACTIVE | COMPLETED
  createdAt: string;
  matchedAt: string | null;
  matchScore: number;
  menteeLabel: string;
  industry: string | null;
  damageTypes: string[];
  descriptionSnippet: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  messageCount: number;
}

/** GET /api/mentoring/mentors/{userId} — 백엔드 멘토 프로필 풀 응답. */
export interface BackendMentorProfile {
  id: number;
  userId: number;
  nickname: string;
  industry: Industry;
  damageTypes: DamageType[];
  employmentType: EmploymentType;
  businessSize: BusinessSize;
  region: Region;
  resolutionMethods: ResolutionMethod[];
  resolutionDuration: string | null;
  damageAmountRange: DamageAmountRange | null;
  bio: string | null;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  capacity: number;
  currentMenteeCount: number;
  consultingFee: number;
  // 자격 검증
  verificationMethod: VerificationMethod | null;
  verifiedCaseIdsJson: string | null;
  evidenceUrlsJson: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/mentoring/match/{matchId}/feedback — 매칭 종료 후 별점/감사 메시지. */
export interface FeedbackPayload {
  rating: number;
  comment?: string;
  resolved?: boolean;
}

/** POST /api/mentoring/mentors — 멘토 신규 등록. */
export interface MentorRegistrationRequest {
  nickname: string;
  industry: Industry;
  damageTypes: DamageType[];
  employmentType: EmploymentType;
  businessSize: BusinessSize;
  region: Region;
  resolutionMethods: ResolutionMethod[];
  /** 평균 해결 소요 일수. */
  resolutionDays: number;
  damageAmountRange: DamageAmountRange;
  bio: string;
  /** 동시 매칭 가능한 멘티 수. */
  capacity: number;
  consultingFee: number;
  verificationMethod: VerificationMethod;
  /** RESOLVED_CASE 자격 검증 시 — 본인 해결 사건 ID 목록. */
  verifiedCaseIds?: number[];
  /** EVIDENCE_UPLOAD 자격 검증 시 — S3 업로드 URL 목록. */
  evidenceUrls?: string[];
}
