import "../global.css";
import { Stack } from "expo-router";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";

export default function RootLayout() {
  return (
    <ActionSheetProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="work-record/[id]" />
        <Stack.Screen name="mentor-chat/[matchId]" />
        <Stack.Screen name="login" />
      </Stack>
    </ActionSheetProvider>
  );
}
