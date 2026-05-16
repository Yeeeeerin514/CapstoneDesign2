import { apiClient } from "@/shared/api/axios-instance";
import type { User } from "../model/types";

interface AuthResponse {
  userId: number;
  name: string;
  email: string;
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<AuthResponse>("/auth/me");
  return {
    id: String(data.userId),
    nickname: data.name ?? data.email,
    role: "mentee",
    isResolutionVerified: false,
    joinedAt: new Date().toISOString(),
  };
}
