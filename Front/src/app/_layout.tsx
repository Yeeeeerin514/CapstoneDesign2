import "../global.css";
import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncFcmToken } from "@/entities/user";
import { cleanExpiredContractPending } from "@/entities/job-post";
import { fetchMinimumWage } from "@/shared/api/minimum-wage-api";
import { useMinimumWageStore } from "@/shared/lib/minimum-wage-store";
import { installWebAlertPolyfill } from "@/shared/lib/web-alert";

// 웹에서 Alert.alert 다중버튼(삭제/확인 등)이 동작하도록 전역 폴리필 설치 (네이티브 무영향)
installWebAlertPolyfill();

const MIN_WAGE_CACHE_KEY = "minimumWage_cache";
const MIN_WAGE_TTL_MS = 24 * 60 * 60 * 1000;

export default function RootLayout(): JSX.Element {
  const setMinimumWage = useMinimumWageStore((s) => s.setMinimumWage);

  useEffect(() => {
    // 최저시급 캐시 로드 + 비동기 갱신
    void (async () => {
      try {
        const cached = await AsyncStorage.getItem(MIN_WAGE_CACHE_KEY);
        if (cached !== null) {
          const parsed = JSON.parse(cached) as {
            wage: number;
            year: number;
            fetchedAt: number;
          };
          if (Date.now() - parsed.fetchedAt < MIN_WAGE_TTL_MS) {
            setMinimumWage(parsed.wage, parsed.year);
            return;
          }
        }
        const res = await fetchMinimumWage();
        setMinimumWage(res.hourlyWage, res.year);
        await AsyncStorage.setItem(
          MIN_WAGE_CACHE_KEY,
          JSON.stringify({
            wage: res.hourlyWage,
            year: res.year,
            fetchedAt: Date.now(),
          }),
        );
      } catch {
        // 실패해도 store 기본값 유지
      }
    })();

    // FCM 토큰 동기화
    void syncFcmToken().catch(() => {
      /* 실패 무시 */
    });

    // 계약서 pending 만료 정리
    void cleanExpiredContractPending().catch(() => {
      /* 실패 무시 */
    });

    // foreground 복귀 시 토큰 재동기화
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void syncFcmToken().catch(() => {
          /* 무시 */
        });
      }
    });
    return () => sub.remove();
  }, [setMinimumWage]);

  return (
    <ActionSheetProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
      </Stack>
    </ActionSheetProvider>
  );
}
