import { create } from "zustand";
import type { AnalyzingStage, JobVerifyResult, RecentAnalysis } from "./types";

interface JobVerifyState {
  imageBase64: string | null;
  imagePreviewUri: string | null;
  stage: AnalyzingStage;
  result: JobVerifyResult | null;
  error: string | null;
  recentResults: RecentAnalysis[];
  setImage: (base64: string | null, previewUri: string | null) => void;
  setStage: (v: AnalyzingStage) => void;
  setResult: (v: JobVerifyResult | null) => void;
  setError: (v: string | null) => void;
  pushRecent: (v: RecentAnalysis) => void;
  reset: () => void;
}

const initialState = {
  imageBase64: null as string | null,
  imagePreviewUri: null as string | null,
  stage: "idle" as AnalyzingStage,
  result: null as JobVerifyResult | null,
  error: null as string | null,
};

export const useJobVerifyStore = create<JobVerifyState>((set) => ({
  ...initialState,
  recentResults: [],
  setImage: (imageBase64, imagePreviewUri) =>
    set({ imageBase64, imagePreviewUri }),
  setStage: (stage) => set({ stage }),
  setResult: (result) => set({ result }),
  setError: (error) => set({ error }),
  pushRecent: (item) =>
    set((s) => ({ recentResults: [item, ...s.recentResults].slice(0, 3) })),
  reset: () =>
    set((s) => ({ ...initialState, recentResults: s.recentResults })),
}));
