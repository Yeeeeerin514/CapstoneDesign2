import { create } from "zustand";
import type { ContractAnalysis } from "@/entities/contract";

interface ContractUploadState {
  imageUri: string | null;
  isAnalyzing: boolean;
  result: ContractAnalysis | null;
  error: string | null;
  setImageUri: (v: string | null) => void;
  setAnalyzing: (v: boolean) => void;
  setResult: (v: ContractAnalysis | null) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

const initialState = {
  imageUri: null as string | null,
  isAnalyzing: false,
  result: null as ContractAnalysis | null,
  error: null as string | null,
};

export const useContractUploadStore = create<ContractUploadState>((set) => ({
  ...initialState,
  setImageUri: (imageUri) => set({ imageUri }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setResult: (result) => set({ result }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
