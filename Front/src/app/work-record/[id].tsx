// app/work-record/[id].tsx — 근무 대시보드 상세 (동적 라우트)
// views 레이어의 WorkDashboardView를 렌더링만 함.
// TODO: WorkDashboardView 구현 후 import 교체
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function WorkDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-lg font-bold text-text-primary">
        근무 대시보드 — {id}
      </Text>
    </View>
  );
}
