import { create } from "zustand";

interface CheckOutState {
  isSubmitting: boolean;
  error: string | null;
  checkedOutAt: string | null;
  isWifiConnected: boolean;
  isBssidMatched: boolean;
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  setCheckedOutAt: (v: string | null) => void;
  setWifiConnected: (v: boolean) => void;
  setBssidMatched: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  isSubmitting: false,
  error: null,
  checkedOutAt: null,
  isWifiConnected: false,
  isBssidMatched: false,
};

export const useCheckOutStore = create<CheckOutState>((set) => ({
  ...initialState,
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error }),
  setCheckedOutAt: (checkedOutAt) => set({ checkedOutAt }),
  setWifiConnected: (isWifiConnected) => set({ isWifiConnected }),
  setBssidMatched: (isBssidMatched) => set({ isBssidMatched }),
  reset: () => set({ ...initialState }),
}));
