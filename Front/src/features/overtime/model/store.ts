import { create } from "zustand";

interface OvertimeState {
  extraHours: number;
  extraMinutes: number;
  isSubmitting: boolean;
  error: string | null;
  setExtraHours: (v: number) => void;
  setExtraMinutes: (v: number) => void;
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

const initialState = {
  extraHours: 0,
  extraMinutes: 0,
  isSubmitting: false,
  error: null,
};

export const useOvertimeStore = create<OvertimeState>((set) => ({
  ...initialState,
  setExtraHours: (extraHours) => set({ extraHours }),
  setExtraMinutes: (extraMinutes) => set({ extraMinutes }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
