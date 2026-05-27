/**
 * 환경변수 단일 진입점.
 * - `process.env` 직접 참조를 코드 전반에서 금지하기 위한 래퍼.
 * - Expo는 `EXPO_PUBLIC_*` 접두사가 붙은 변수만 클라이언트 번들에 노출함.
 */
export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080/api",
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? "development") as
    | "development"
    | "production",
} as const;
