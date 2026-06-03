import { create } from "zustand";
import type { ResolveReview } from "./types";
import {
  createReview,
  fetchReviews,
  markReviewHelpful,
} from "../api/reviews-api";

interface ReviewState {
  reviews: ResolveReview[];

  /** 백엔드에서 후기 목록 로드. (report 탭 진입 시 호출) */
  load: () => Promise<void>;

  /** 후기 추가 — 낙관적 반영 후 백엔드 저장, 성공 시 실제 레코드로 교체. */
  addReview: (
    input: Omit<ResolveReview, "id" | "createdAt" | "helpfulCount">,
  ) => void;

  /** "도움됐어요" 카운트 +1 (낙관적 + 백엔드 반영). */
  markHelpful: (reviewId: string) => void;

  getById: (id: string) => ResolveReview | undefined;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],

  load: async () => {
    try {
      const data = await fetchReviews();
      set({ reviews: data });
    } catch {
      // 미로그인/네트워크 실패 시 기존 목록 유지
    }
  },

  addReview: (input) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ResolveReview = {
      ...input,
      id: tempId,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ reviews: [optimistic, ...state.reviews] }));
    void createReview(input)
      .then((saved) =>
        set((state) => ({
          reviews: state.reviews.map((r) => (r.id === tempId ? saved : r)),
        })),
      )
      .catch(() => undefined);
  },

  markHelpful: (reviewId) => {
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r,
      ),
    }));
    if (!reviewId.startsWith("tmp-")) {
      void markReviewHelpful(reviewId).catch(() => undefined);
    }
  },

  getById: (id) => get().reviews.find((r) => r.id === id),
}));
