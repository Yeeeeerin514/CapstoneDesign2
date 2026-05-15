import { create } from "zustand";
import type { SolidarityGroup } from "./types";

interface SolidarityState {
  group: SolidarityGroup | null;
  isJoining: boolean;
  error: string | null;
  setGroup: (v: SolidarityGroup | null) => void;
  setJoining: (v: boolean) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

const initialState = {
  group: null as SolidarityGroup | null,
  isJoining: false,
  error: null as string | null,
};

export const useSolidarityStore = create<SolidarityState>((set) => ({
  ...initialState,
  setGroup: (group) => set({ group }),
  setJoining: (isJoining) => set({ isJoining }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
