import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateFcmToken } from "../api/update-fcm-token";

const FCM_CACHE_KEY = "fcmToken";

/**
 * Expo push 토큰을 받아 백엔드와 동기화.
 *  - 권한 거부: silent return
 *  - 캐시 동일: skip (불필요한 PUT 회피)
 *  - PUT 실패: warn만 (앱 동작에 영향 없음)
 *
 * 로그인 성공 직후 + 앱 포그라운드 복귀 시 호출.
 * 호출 측에서는 await 없이 fire-and-forget 사용 (로그인 플로우 블로킹 방지).
 */
export async function syncFcmToken(): Promise<void> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const { data: newToken } = await Notifications.getExpoPushTokenAsync();
    const cached = await AsyncStorage.getItem(FCM_CACHE_KEY);
    if (cached === newToken) return;
    await updateFcmToken(newToken);
    await AsyncStorage.setItem(FCM_CACHE_KEY, newToken);
  } catch (e) {
    console.warn("[FCM] 동기화 실패 (무시됨):", e);
  }
}
