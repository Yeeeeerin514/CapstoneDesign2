import { create } from "zustand";

interface CheckInState {
  isSubmitting: boolean;
  error: string | null;
  checkedInAt: string | null;
  // setter
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  setCheckedInAt: (v: string | null) => void;
  reset: () => void;
}

const initialState = {
  isSubmitting: false,
  error: null,
  checkedInAt: null,
};

export const useCheckInStore = create<CheckInState>((set) => ({
  ...initialState,
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error }),
  setCheckedInAt: (checkedInAt) => set({ checkedInAt }),
  reset: () => set({ ...initialState }),
}));
