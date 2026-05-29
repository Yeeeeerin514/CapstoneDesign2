import { Platform } from "react-native";
import type { WifiNetwork } from "./wifi-scanner";
import { useBssidScanStore } from "../model/store";

/** Mock 토글: Expo Go나 개발 편의를 위해 mock 데이터 사용. */
const USE_MOCK = true;

const MOCK_NETWORKS: WifiNetwork[] = [
  { ssid: "CafeGangnam_5G", bssid: "aa:bb:cc:dd:ee:ff", level: -45 },
  { ssid: "CafeGangnam_2.4G", bssid: "aa:bb:cc:dd:ee:fe", level: -52 },
  { ssid: "Guest_WiFi", bssid: "11:22:33:44:55:66", level: -68 },
  { ssid: "SK_WiFi_1234", bssid: "99:88:77:66:55:44", level: -78 },
];

/**
 * 주변 Wi-Fi 스캔 → store에 결과 푸시.
 * - mock일 때 1.2초 지연 후 더미 데이터.
 * - 실제일 때 wifi-scanner 동적 import.
 */
export async function scanWifiNetworks(): Promise<void> {
  const { setScanning, setNetworks, setError } = useBssidScanStore.getState();
  setScanning(true);
  setError(null);
  try {
    if (USE_MOCK) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      setNetworks(MOCK_NETWORKS);
      return;
    }
    if (Platform.OS !== "android") {
      throw new Error("Wi-Fi 스캔은 Android에서만 가능합니다.");
    }
    const { scanWifiNetworks: realScan } = await import("./wifi-scanner");
    const networks = await realScan();
    setNetworks(networks);
  } catch (e) {
    setError(e instanceof Error ? e.message : "Wi-Fi 스캔 실패");
  } finally {
    setScanning(false);
  }
}
