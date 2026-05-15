// app/(tabs)/workplace.tsx — 관심업장 탭
// views 레이어의 WorkplaceView를 렌더링만 함.
// TODO: WorkplaceView 구현 후 import 교체
import { View, Text } from "react-native";

export default function WorkplaceScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-lg font-bold text-text-primary">관심업장</Text>
    </View>
  );
}
