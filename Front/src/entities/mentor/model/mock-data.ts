import { calcMentorScore, type MentorProfile } from "./types";

function withScore(
  base: Omit<MentorProfile, "score">,
): MentorProfile {
  return { ...base, score: calcMentorScore(base) };
}

export const MOCK_MENTORS: MentorProfile[] = [
  withScore({
    userId: "mentor-001",
    nickname: "닉네임A",
    isVerified: true,
    wasGroupLeader: true,
    averageRating: 4.8,
    reviewCount: 12,
    resolvedDays: 18,
    industry: "카페·음식점",
    damageTypes: ["임금체불", "주휴수당"],
    consultingFee: 10000,
    badges: ["인증멘토", "공동대응대표"],
    bio: "진정서 핵심은 날짜와 금액이에요. 18일 만에 해결했습니다.",
  }),
  withScore({
    userId: "mentor-002",
    nickname: "닉네임B",
    isVerified: false,
    wasGroupLeader: false,
    averageRating: 5.0,
    reviewCount: 3,
    resolvedDays: 21,
    industry: "편의점",
    damageTypes: ["임금체불", "연장수당"],
    consultingFee: 10000,
    badges: [],
    bio: "5명 공동대응으로 전액 받았어요. 혼자 말고 같이 하세요.",
  }),
  withScore({
    userId: "mentor-003",
    nickname: "닉네임C",
    isVerified: true,
    wasGroupLeader: false,
    averageRating: 4.5,
    reviewCount: 7,
    resolvedDays: 30,
    industry: "카페·음식점",
    damageTypes: ["임금체불"],
    consultingFee: 10000,
    badges: ["인증멘토", "빠른해결"],
    bio: "처음엔 무서웠지만 생각보다 어렵지 않아요.",
  }),
];
