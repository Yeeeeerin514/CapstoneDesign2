import { create } from "zustand";

interface AuthState {
  token: string | null;
  userId: number | null;
  name: string | null;
  email: string | null;
  setAuth: (token: string, userId: number, name: string, email: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  name: null,
  email: null,
  setAuth: (token, userId, name, email) =>
    set({ token, userId, name, email }),
  clearAuth: () => set({ token: null, userId: null, name: null, email: null }),
}));
