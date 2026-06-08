import { apiClient } from "@/shared/api/axios-instance";

/**
 * 사용자별 store 상태 기기간 동기화 (best-effort).
 *
 * - 로컬 영속(localStorage/AsyncStorage)은 그대로 두고, 그 위에 서버 동기화를 얹는다.
 * - apiClient가 JWT를 자동 주입하므로 로그인 상태에서만 실제 저장/조회됨(미로그인 시 401 → 무시).
 * - 모든 실패는 조용히 무시 → 클라우드가 안 돼도 앱은 기존(로컬)과 동일하게 동작(무오류).
 *
 * 서버: GET/PUT /api/client-state/{key} (clientstate.ClientStateController)
 */
export async function pullCloud<T>(key: string): Promise<T | null> {
  try {
    const { data } = await apiClient.get<{ payload: string | null }>(
      `/client-state/${key}`,
    );
    if (
      data !== null &&
      data !== undefined &&
      typeof data.payload === "string" &&
      data.payload.length > 0
    ) {
      return JSON.parse(data.payload) as T;
    }
  } catch {
    /* 네트워크/미로그인 → null (로컬 캐시 유지) */
  }
  return null;
}

const pushTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/** store 상태를 서버에 저장 (디바운스 1.5초, best-effort). */
export function pushCloud(key: string, value: unknown): void {
  const existing = pushTimers[key];
  if (existing !== undefined) clearTimeout(existing);
  pushTimers[key] = setTimeout(() => {
    void apiClient
      .put(`/client-state/${key}`, { payload: JSON.stringify(value) })
      .catch(() => {
        /* best-effort — 실패해도 로컬엔 이미 저장됨 */
      });
  }, 1500);
}
