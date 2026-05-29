import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/shared/lib/zustand-storage";

/**
 * 통합 인증 스토어.
 * - 백엔드 토큰/숫자 userId: `token`/`userId`/`name`/`email` (apiClient 인터셉터 + login 화면)
 * - 앱 도메인 사용자 식별 (멘토 매칭/그룹/결제/후기 등): `userIdString`/`nickname`/`isLoggedIn`
 *   Phase A에서는 mock 기본값으로 시작 (`current-user-mock` / "나" / true).
 * - AsyncStorage(네이티브)/localStorage(웹) 영속화.
 */
interface AuthState {
  // 백엔드 인증
  token: string | null;
  userId: number | null;
  name: string | null;
  email: string | null;

  // 앱 도메인 사용자 식별 (Phase A: mock)
  userIdString: string;
  nickname: string;
  isLoggedIn: boolean;

  setAuth: (token: string, userId: number, name: string, email: string) => void;
  clearAuth: () => void;

  /** Phase A mock 로그인 — userIdString/nickname/isLoggedIn 갱신. */
  login: (userIdString: string, nickname: string) => void;
  /** 모든 인증 상태 초기화 (백엔드/도메인 동시). */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      name: null,
      email: null,

      userIdString: "current-user-mock",
      nickname: "나",
      isLoggedIn: true,

      setAuth: (token, userId, name, email) =>
        set({
          token,
          userId,
          name,
          email,
          // 백엔드 로그인 성공 시 도메인 ID도 갱신
          userIdString: String(userId),
          nickname: name ?? "",
          isLoggedIn: true,
        }),

      clearAuth: () =>
        set({
          token: null,
          userId: null,
          name: null,
          email: null,
          isLoggedIn: false,
        }),

      login: (userIdString, nickname) =>
        set({ userIdString, nickname, isLoggedIn: true }),

      logout: () =>
        set({
          token: null,
          userId: null,
          name: null,
          email: null,
          userIdString: "",
          nickname: "",
          isLoggedIn: false,
        }),
    }),
    {
      name: "albasave-auth",
      storage: persistStorage,
      version: 2,
      migrate: (persisted: unknown, version) => {
        // v1 → v2: userIdString/nickname/isLoggedIn 파생 필드 추가
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
          if (state.isLoggedIn === undefined) {
            state.isLoggedIn = state.token != null;
          }
        }
        return persisted as AuthState;
      },
    },
  ),
);
