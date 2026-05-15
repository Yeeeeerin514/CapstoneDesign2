// app/(tabs)/report.tsx — 신고 탭
// views 레이어의 ReportView를 렌더링만 함.
// TODO: ReportView 구현 후 import 교체
import { View, Text } from "react-native";

export default function ReportScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-lg font-bold text-text-primary">신고</Text>
    </View>
  );
}
