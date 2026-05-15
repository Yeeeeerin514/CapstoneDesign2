import { View, Text } from "react-native";

/**
 * 홈 화면 — 공고 검증 뷰
 * widgets/features/entities를 배치만 함. 비즈니스 로직 직접 작성 금지.
 * TODO: JobVerifyWidget, RecentAnalysisList 등 위젯/피처 import 후 배치
 */
export function HomeView() {
  return (
    <View className="flex-1 bg-surface px-4 pt-6">
      <Text className="text-2xl font-bold text-text-primary mb-2">알바 공고 검증</Text>
      <Text className="text-sm text-text-secondary">
        공고 URL 또는 캡처 이미지를 입력해 위법 사항을 확인하세요.
      </Text>
      {/* TODO: JobVerifyFeature, RecentAnalysisList */}
    </View>
  );
}
