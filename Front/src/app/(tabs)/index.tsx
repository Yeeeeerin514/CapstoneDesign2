// app/(tabs)/index.tsx — 홈 탭 (공고 검증)
// views 레이어의 HomeView를 렌더링만 함. 비즈니스 로직 직접 작성 금지.
// TODO: HomeView 구현 후 import 교체
import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-lg font-bold text-text-primary">홈 — 공고 검증</Text>
    </View>
  );
}
