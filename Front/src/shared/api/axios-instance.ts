import axios, { type AxiosInstance } from "axios";
import { env } from "@/shared/config/env";

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
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
