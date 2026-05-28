import { create } from "zustand";
import { MOCK_MENTORS, type MentorProfile } from "@/entities/mentor";

interface MentorState {
  mentors: MentorProfile[];

  /**
   * 업종 + 피해유형 기반 mock 매칭.
   * 업종이 같거나, damageTypes가 1개 이상 겹치면 후보.
   * score 내림차순 정렬, top-3 반환.
   */
  getRecommended: (
    industry: string,
    damageTypes: string[],
  ) => MentorProfile[];

  /** 단일 조회. */
  getMentorById: (userId: string) => MentorProfile | undefined;

  /** 멘토 신규 등록 — 후기 작성 + 멘토 등록 체크 시 호출. */
  addMentor: (profile: MentorProfile) => void;
}

export const useMentorStore = create<MentorState>((set, get) => ({
  mentors: MOCK_MENTORS,

  getRecommended: (industry, damageTypes) => {
    const all = get().mentors;
    return [...all]
      .filter(
        (m) =>
          m.industry === industry ||
          m.damageTypes.some((d) => damageTypes.includes(d)),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  },

  getMentorById: (userId) =>
    get().mentors.find((m) => m.userId === userId),

  addMentor: (profile) =>
    set((state) => ({ mentors: [...state.mentors, profile] })),
}));
