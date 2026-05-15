import { create } from "zustand";
import type { MentorProfile } from "@/entities/mentor";

interface MentorMatchState {
  recommendedMentors: MentorProfile[];
  selectedMentor: MentorProfile | null;
  isLoading: boolean;
  error: string | null;
  setRecommendedMentors: (v: MentorProfile[]) => void;
  setSelectedMentor: (v: MentorProfile | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

const initialState = {
  recommendedMentors: [] as MentorProfile[],
  selectedMentor: null as MentorProfile | null,
  isLoading: false,
  error: null as string | null,
};

export const useMentorMatchStore = create<MentorMatchState>((set) => ({
  ...initialState,
  setRecommendedMentors: (recommendedMentors) => set({ recommendedMentors }),
  setSelectedMentor: (selectedMentor) => set({ selectedMentor }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
