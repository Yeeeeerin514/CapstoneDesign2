import { apiClient } from "@/shared/api/axios-instance";
import type { ResolveReview } from "../model/types";

export type ReviewInput = Omit<
  ResolveReview,
  "id" | "createdAt" | "helpfulCount"
>;

interface ApiReview {
  id: string;
  authorNickname: string;
  authorBadges: string[];
  industry: string;
  region: string;
  damageType: string;
  resolutionMethod: string;
  unpaidAmountRange: string;
  resolveDays: number;
  rating: number;
  title: string;
  content: string;
  tips: { complaint: string; investigation: string; negotiation: string };
  helpfulCount: number;
  isMentor: boolean;
  mentorUserId: string | null;
  createdAt: string;
}

function toReview(a: ApiReview): ResolveReview {
  return {
    id: a.id,
    authorNickname: a.authorNickname,
    authorBadges: a.authorBadges ?? [],
    industry: a.industry,
    region: a.region,
    damageType: a.damageType as ResolveReview["damageType"],
    resolutionMethod: a.resolutionMethod as ResolveReview["resolutionMethod"],
    unpaidAmountRange: a.unpaidAmountRange,
    resolveDays: a.resolveDays,
    rating: a.rating,
    title: a.title,
    content: a.content,
    tips: a.tips,
    helpfulCount: a.helpfulCount,
    isMentor: a.isMentor,
    mentorUserId: a.mentorUserId,
    createdAt: a.createdAt,
  };
}

/** GET /api/reviews — 후기 목록(최신순). */
export async function fetchReviews(): Promise<ResolveReview[]> {
  const { data } = await apiClient.get<ApiReview[]>("/reviews");
  return data.map(toReview);
}

/** POST /api/reviews — 후기 작성. */
export async function createReview(input: ReviewInput): Promise<ResolveReview> {
  const { data } = await apiClient.post<ApiReview>("/reviews", {
    authorNickname: input.authorNickname,
    authorBadges: input.authorBadges,
    industry: input.industry,
    region: input.region,
    damageType: input.damageType,
    resolutionMethod: input.resolutionMethod,
    unpaidAmountRange: input.unpaidAmountRange,
    resolveDays: input.resolveDays,
    rating: input.rating,
    title: input.title,
    content: input.content,
    tips: input.tips,
    isMentor: input.isMentor,
    mentorUserId: input.mentorUserId,
  });
  return toReview(data);
}

/** POST /api/reviews/{id}/helpful — "도움됐어요" +1. */
export async function markReviewHelpful(id: string): Promise<void> {
  await apiClient.post(`/reviews/${id}/helpful`);
}

/** Q&A 댓글 — 백엔드 ReviewCommentResponse와 1:1. */
export interface ReviewComment {
  id: string;
  authorNickname: string;
  isAuthor: boolean;
  body: string;
  createdAt: string;
}

/** GET /api/reviews/{id}/comments — Q&A 댓글 목록(공개). */
export async function fetchReviewComments(
  reviewId: string,
): Promise<ReviewComment[]> {
  const { data } = await apiClient.get<ReviewComment[]>(
    `/reviews/${reviewId}/comments`,
  );
  return data;
}

/** POST /api/reviews/{id}/comments — Q&A 댓글 작성(본문만; 작성자 판별은 서버 JWT). */
export async function createReviewComment(
  reviewId: string,
  body: string,
): Promise<ReviewComment> {
  const { data } = await apiClient.post<ReviewComment>(
    `/reviews/${reviewId}/comments`,
    { body },
  );
  return data;
}
