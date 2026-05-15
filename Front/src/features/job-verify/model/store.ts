import { create } from "zustand";
import type { JobVerifyResult } from "./types";

interface JobVerifyState {
  jobUrl: string;
  isAnalyzing: boolean;
  result: JobVerifyResult | null;
  error: string | null;
  setJobUrl: (v: string) => void;
  setAnalyzing: (v: boolean) => void;
  setResult: (v: JobVerifyResult | null) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

const initialState = {
  jobUrl: "",
  isAnalyzing: false,
  result: null as JobVerifyResult | null,
  error: null as string | null,
};

export const useJobVerifyStore = create<JobVerifyState>((set) => ({
  ...initialState,
  setJobUrl: (jobUrl) => set({ jobUrl }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setResult: (result) => set({ result }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
