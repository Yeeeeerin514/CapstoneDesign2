import { apiClient } from "@/shared/api/axios-instance";
import type { User } from "../model/types";

interface AuthResponse {
  userId: number;
  name: string;
  email: string;
  // 백엔드 boolean getter 직렬화 특성으로 두 키 모두 올 수 있음.
  isMentor?: boolean;
  mentor?: boolean;
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<AuthResponse>("/auth/me");
  const isMentor = Boolean(data.isMentor ?? data.mentor ?? false);
  return {
    id: String(data.userId),
    nickname: data.name ?? data.email,
    role: isMentor ? "mentor" : "mentee",
    isResolutionVerified: isMentor,
    joinedAt: new Date().toISOString(),
  };
}
