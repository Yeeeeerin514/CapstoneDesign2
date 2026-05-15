import "../global.css";
import { Stack } from "expo-router";

/**
 * 루트 레이아웃
 * - NativeWind 글로벌 CSS 임포트
 * - Expo Router Stack 최상위 셸
 */
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="work-record/[id]" />
    </Stack>
  );
}
