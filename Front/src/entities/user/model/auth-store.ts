import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/shared/lib/zustand-storage";

/**
 * 인증 상태.
 *
 * - userId / name / email: 원본 필드
 * - userIdString / nickname: UI에서 쉽게 쓰는 파생 필드
 *   (zustand computed가 표준 아니라서 setAuth에서 함께 채움)
 */
interface AuthState {
  token: string | null;
  userId: number | null;
  name: string | null;
  email: string | null;

  /** 파생 — UI 코드 호환성용. userId를 string으로. 비로그인 시 "". */
  userIdString: string;
  /** 파생 — UI 코드 호환성용. name과 동일. 비로그인 시 "". */
  nickname: string;

  setAuth: (token: string, userId: number, name: string, email: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      name: null,
      email: null,
      userIdString: "",
      nickname: "",
      setAuth: (token, userId, name, email) =>
        set({
          token,
          userId,
          name,
          email,
          userIdString: String(userId),
          nickname: name ?? "",
        }),
      clearAuth: () =>
        set({
          token: null,
          userId: null,
          name: null,
          email: null,
          userIdString: "",
          nickname: "",
        }),
    }),
    {
      name: "albasave-auth",
      storage: persistStorage,
      version: 2,
      migrate: (persisted: unknown, version) => {
        // v1 → v2: userIdString/nickname 파생 필드 추가
        if (
          persisted !== null &&
          typeof persisted === "object" &&
          version < 2
        ) {
          const state = persisted as Record<string, unknown>;
          if (state.userIdString === undefined) {
            state.userIdString = state.userId != null ? String(state.userId) : "";
          }
          if (state.nickname === undefined) {
            state.nickname = (state.name as string | null) ?? "";
          }
        }
        return persisted as AuthState;
      },
    },
  ),
);
