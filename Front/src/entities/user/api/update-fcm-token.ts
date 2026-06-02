import { apiClient } from "@/shared/api/axios-instance";

/**
 * PUT /api/auth/fcm-token — FCM 토큰 등록/갱신.
 * 응답 204 No Content — body 없음, data 접근 금지.
 * 인증 필요 (apiClient 인터셉터가 Bearer 자동 부착).
 */
export async function updateFcmToken(fcmToken: string): Promise<void> {
  await apiClient.put("/auth/fcm-token", { fcmToken });
}
