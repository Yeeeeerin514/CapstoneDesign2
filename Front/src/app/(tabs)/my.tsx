// app/(tabs)/my.tsx — 마이페이지 탭
// views 레이어의 MyView를 렌더링만 함.
// TODO: MyView 구현 후 import 교체
import { View, Text } from "react-native";

export default function MyScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-lg font-bold text-text-primary">마이페이지</Text>
    </View>
  );
}
