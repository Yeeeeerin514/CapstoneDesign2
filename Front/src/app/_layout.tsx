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
import { useAuthStore } from "@/entities/user/model/auth-store";
import { pullCloud, pushCloud } from "@/shared/lib/cloud-sync";
import { useReportStore } from "@/features/report-submit";
import { useMentorMatchStore } from "@/features/mentor-match";
import type { ReportCase } from "@/entities/report";
import type { MentorMatch } from "@/entities/mentor";

// 웹에서 Alert.alert 다중버튼(삭제/확인 등)이 동작하도록 전역 폴리필 설치 (네이티브 무영향)
installWebAlertPolyfill();

const MIN_WAGE_CACHE_KEY = "minimumWage_cache";
const MIN_WAGE_TTL_MS = 24 * 60 * 60 * 1000;

export default function RootLayout(): JSX.Element {
  const setMinimumWage = useMinimumWageStore((s) => s.setMinimumWage);
  const token = useAuthStore((s) => s.token);

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

  // 기기간 동기화: 로그인 시 서버에서 신고 사건·멘토 매칭 상태를 받아 store에 반영.
  // (로컬 캐시는 그대로 유지, 서버에 더 최신 데이터가 있으면 덮어씀. 실패 시 무시 → 로컬 동작)
  useEffect(() => {
    if (token === null || token.length === 0) return;
    let cancelled = false;
    void (async () => {
      const cases = await pullCloud<ReportCase[]>("report");
      if (!cancelled && Array.isArray(cases) && cases.length > 0) {
        useReportStore.setState({ cases });
      }
      const matches = await pullCloud<MentorMatch[]>("mentor-match");
      if (!cancelled && Array.isArray(matches) && matches.length > 0) {
        useMentorMatchStore.setState({ matches });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // store 변경 → 서버로 디바운스 푸시 (구독 1회 설치).
  useEffect(() => {
    const unsubReport = useReportStore.subscribe((s) =>
      pushCloud("report", s.cases),
    );
    const unsubMatch = useMentorMatchStore.subscribe((s) =>
      pushCloud("mentor-match", s.matches),
    );
    return () => {
      unsubReport();
      unsubMatch();
    };
  }, []);

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
