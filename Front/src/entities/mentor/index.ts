// 기존 mock 기반 모델 (호환 유지)
export type {
  MentorProfile,
  MentorBadge,
  EscrowOrder,
  EscrowStatus,
  MentorMatch,
  MentorMatchStatus,
  MentorChatMessage,
} from "./model/types";
export { calcMentorScore } from "./model/types";
export { MOCK_MENTORS } from "./model/mock-data";

// Phase 1 — 실제 백엔드 매칭 시스템 (Gower + Gale-Shapley + Thompson Sampling)
export type {
  Industry,
  DamageType,
  EmploymentType,
  BusinessSize,
  Region,
  ResolutionMethod,
  DamageAmountRange,
  VerificationMethod,
  MatchStatus,
  MentorRegistrationRequest,
  MatchRequestPayload,
  MatchContribution,
  MatchRecommendation,
  MatchResponseEnvelope,
  FeedbackPayload,
  BackendMentorProfile,
} from "./model/matching-types";
export {
  INDUSTRY_LABEL,
  DAMAGE_TYPE_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  BUSINESS_SIZE_LABEL,
  REGION_LABEL,
  RESOLUTION_METHOD_LABEL,
  DAMAGE_AMOUNT_LABEL,
  VERIFICATION_METHOD_LABEL,
} from "./model/matching-types";
export {
  registerMentor,
  fetchMyMentorProfile,
  requestMatch,
  confirmMatch,
  submitMatchingFeedback,
  fetchMyMatches,
  fetchMatchingWeights,
  uploadMentorEvidence,
  fetchChatMessages,
  sendChatMessage,
} from "./api/matching-api";
export type { BackendChatMessage } from "./api/matching-api";
