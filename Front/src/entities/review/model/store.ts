import { create } from "zustand";
import { MOCK_REVIEWS } from "./mock-data";
import type { ResolveReview } from "./types";

interface ReviewState {
  reviews: ResolveReview[];

  /** 후기 추가 — id/createdAt/helpfulCount는 자동 채움. */
  addReview: (
    input: Omit<ResolveReview, "id" | "createdAt" | "helpfulCount">,
  ) => void;

  /** "도움됐어요" 카운트 +1. */
  markHelpful: (reviewId: string) => void;

  getById: (id: string) => ResolveReview | undefined;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: MOCK_REVIEWS,

  addReview: (input) =>
    set((state) => ({
      reviews: [
        {
          ...input,
          id: `review-${Date.now()}`,
          helpfulCount: 0,
          createdAt: new Date().toISOString(),
        },
        ...state.reviews,
      ],
    })),

  markHelpful: (reviewId) =>
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r,
      ),
    })),

  getById: (id) => get().reviews.find((r) => r.id === id),
}));
