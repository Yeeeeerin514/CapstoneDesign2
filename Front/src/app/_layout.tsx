import "../global.css";
import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { syncFcmToken } from "@/entities/user";

export default function RootLayout() {
  // 앱 포그라운드 복귀 시 FCM 토큰 동기화 (로그인 상태일 때만 백엔드 반영됨)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void syncFcmToken();
    });
    return () => sub.remove();
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
