// app/(tabs)/work-record.tsx — 근무기록 탭
// views 레이어의 WorkRecordView를 렌더링만 함.
// TODO: WorkRecordView 구현 후 import 교체
import { View, Text } from "react-native";

export default function WorkRecordScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-lg font-bold text-text-primary">근무기록</Text>
    </View>
  );
}
