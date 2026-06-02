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

const MIN_WAGE_CACHE_KEY = "minimumWage_cache";
const MIN_WAGE_TTL_MS = 24 * 60 * 60 * 1000;

export default function RootLayout() {
  // 앱 포그라운드 복귀 시 FCM 토큰 동기화 (로그인 상태일 때만 백엔드 반영됨)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void syncFcmToken();
    });
    return () => sub.remove();
  }, []);

  // 앱 시작 시 30일 만료된 계약서 임시 캐시 정리
  useEffect(() => {
    void cleanExpiredContractPending();
  }, []);

  // 앱 시작 시 최저시급 24h 캐시 로드 — 캐시 만료 시 백엔드 조회 후 갱신
  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(MIN_WAGE_CACHE_KEY);
        if (raw !== null) {
          const cached = JSON.parse(raw) as {
            hourlyWage: number;
            year: number;
            cachedAt: number;
          };
          if (Date.now() - cached.cachedAt < MIN_WAGE_TTL_MS) {
            useMinimumWageStore
              .getState()
              .setMinimumWage(cached.hourlyWage, cached.year);
            return;
          }
        }
        const { hourlyWage, year } = await fetchMinimumWage(
          new Date().getFullYear(),
        );
        useMinimumWageStore.getState().setMinimumWage(hourlyWage, year);
        await AsyncStorage.setItem(
          MIN_WAGE_CACHE_KEY,
          JSON.stringify({ hourlyWage, year, cachedAt: Date.now() }),
        );
      } catch {
        // 네트워크/파싱 실패 — store는 폴백 값 유지
      }
    })();
  }, []);

  return (
    <ActionSheetProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="work-record/[id]" />
        <Stack.Screen name="mentor-chat/[matchId]" />
        <Stack.Screen name="contract-detail/[contractId]" />
        <Stack.Screen name="login" />
      </Stack>
    </ActionSheetProvider>
  );
}
