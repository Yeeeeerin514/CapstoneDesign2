import axios, { type AxiosInstance } from "axios";
import { env } from "@/shared/config/env";

/**
 * 백엔드 API 클라이언트.
 * - 모든 도메인(`entities/*`)의 fetch 함수는 이 인스턴스를 사용합니다.
 * - 인증 토큰 인터셉터는 추후 user/auth 슬라이스에서 주입.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Anthropic Claude API 클라이언트.
 * - 계약서 분석, 공고 검증, 진정서 생성에 사용.
 * - 키는 `EXPO_PUBLIC_ANTHROPIC_KEY` 환경변수에서 주입.
 *
 * 보안 주의: 프로덕션에서는 키를 클라이언트에 두지 말고
 * 백엔드 프록시로 호출하는 게 원칙. 본 프로젝트는 MVP 단계라 직접 호출.
 */
export const claudeClient: AxiosInstance = axios.create({
  baseURL: "https://api.anthropic.com/v1",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "x-api-key": env.anthropicKey,
  },
});
