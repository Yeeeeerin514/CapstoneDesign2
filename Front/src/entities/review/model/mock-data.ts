import type { ResolveReview } from "./types";

export const MOCK_REVIEWS: ResolveReview[] = [
  {
    id: "review-001",
    authorNickname: "닉네임A",
    authorBadges: ["🛡 인증멘토", "⚡ 빠른해결"],
    industry: "카페·음식점",
    region: "서울",
    damageType: "주휴수당 미지급",
    resolutionMethod: "노동청 진정",
    unpaidAmountRange: "100만원대",
    resolveDays: 18,
    rating: 4.8,
    title: "2주만에 해결했어요, 진정서 이렇게 쓰세요",
    content:
      "처음에는 너무 막막했는데, 진정서를 정확하게 쓰니까 노동청에서도 빠르게 움직였습니다. 사장님이 처음엔 무시했지만 출석조사 통보를 받고 나서 태도가 바뀌더라고요.",
    tips: {
      complaint: "날짜와 금액을 정확히, 법 조항은 몰라도 됩니다",
      investigation: "출석조사 때 통장 내역 꼭 지참하세요",
      negotiation: "사업주가 버티면 형사 고소 언급만 해도 달라져요",
    },
    helpfulCount: 24,
    isMentor: true,
    mentorUserId: "mentor-001",
    createdAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "review-002",
    authorNickname: "닉네임B",
    authorBadges: [],
    industry: "편의점",
    region: "경기",
    damageType: "임금(기본급) 미지급",
    resolutionMethod: "노동청 진정",
    unpaidAmountRange: "50만원대",
    resolveDays: 21,
    rating: 5.0,
    title: "출석조사 한 번에 끝내고 3주 만에 전액 수령",
    content:
      "사장님이 처음엔 못 준다고 버텼는데, 진정서에 통장 내역과 근무기록까지 첨부해서 제출했더니 출석조사 한 번에 시정지시가 떨어졌어요.",
    tips: {
      complaint: "통장 내역과 근무기록을 같이 첨부하면 빨라요",
      investigation: "",
      negotiation: "",
    },
    helpfulCount: 31,
    isMentor: false,
    mentorUserId: null,
    createdAt: "2026-04-20T00:00:00Z",
  },
];
