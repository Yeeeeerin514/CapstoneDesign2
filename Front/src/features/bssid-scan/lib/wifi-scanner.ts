import { Platform } from "react-native";

export interface WifiNetwork {
  bssid: string;
  ssid: string;
  /** 신호 강도 (dBm). 값이 클수록 (0에 가까울수록) 좋음. */
  level: number;
}

/**
 * 주변 Wi-Fi 스캔.
 * - Android 전용 (`react-native-wifi-reborn`).
 * - Expo Go에서는 네이티브 모듈이 없어 require 시점 크래시 → 동적 import.
 * - 개발 빌드(`eas build --profile development`)에서만 실제 동작.
 *
 * @throws iOS/web에서 호출 시 즉시 에러.
 */
export async function scanWifiNetworks(): Promise<WifiNetwork[]> {
  if (Platform.OS !== "android") {
    throw new Error("BSSID 기능은 Android에서만 사용 가능합니다");
  }
  // 동적 import로 Expo Go 크래시 회피.
  const mod = await import("react-native-wifi-reborn");
  const list = await mod.default.loadWifiList();
  return list.map((n) => ({
    bssid: n.BSSID,
    ssid: n.SSID,
    level: n.level,
  }));
}

/**
 * 현재 연결된 Wi-Fi의 BSSID 조회.
 * - 출근/퇴근 자동 감지 (BSSID 일치 여부) 확인용.
 */
export async function getCurrentBssid(): Promise<string | null> {
  if (Platform.OS !== "android") return null;
  try {
    const mod = await import("react-native-wifi-reborn");
    return await mod.default.getBSSID();
  } catch {
    return null;
  }
}
