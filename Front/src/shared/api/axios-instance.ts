import axios, { AxiosError, type AxiosInstance } from "axios";
import { env } from "@/shared/config/env";

/**
 * apiClient: 기본 axios 인스턴스.
 *
 * 헤더 설계:
 * - default Content-Type을 지정하지 않음.
 *   axios가 데이터 종류에 따라 자동 설정:
 *   - plain object → "application/json"
 *   - FormData (브라우저) → "multipart/form-data; boundary=..." 자동
 * - RN(native)는 FormData 감지가 약해서 호출부에서 명시적으로 multipart/form-data 지정.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
});

// JWT 토큰 자동 주입 인터셉터
apiClient.interceptors.request.use((config) => {
  const { useAuthStore } = require("@/entities/user/model/auth-store");
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 응답 인터셉터: 백엔드 {error: "..."} 메시지를 Error.message로 승격해
 * 화면 catch에서 사용자 친화적 메시지를 그대로 보여줄 수 있게 한다.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    const backendMessage = error.response?.data?.error;
    if (backendMessage && typeof backendMessage === "string") {
      error.message = backendMessage;
    } else if (error.code === "ECONNABORTED") {
      error.message = "서버 응답이 너무 오래 걸려요. 잠시 후 다시 시도해주세요.";
    } else if (error.message === "Network Error") {
      error.message = "서버에 연결할 수 없어요. 네트워크 상태를 확인해주세요.";
    }
    return Promise.reject(error);
  },
);
