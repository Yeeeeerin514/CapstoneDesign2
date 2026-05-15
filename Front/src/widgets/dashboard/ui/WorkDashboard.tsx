import { View, Text } from "react-native";

/**
 * 근무 대시보드 위젯
 * entities/attendance, entities/workplace를 조합해 통계 카드를 표시
 * TODO: 주간 근무시간, 수당, 이번 달 출근 횟수 통계 카드 구현
 */
export function WorkDashboard() {
  return (
    <View className="gap-3">
      {/* TODO: 통계 카드 3개 (주간 근무시간 / 주간 수당 / 이번 달 출근 횟수) */}
      <View className="bg-card rounded-2xl p-4 border border-border">
        <Text className="text-sm text-text-secondary">이번 주 근무시간</Text>
        <Text className="text-2xl font-bold text-text-primary">0h 0m</Text>
      </View>
    </View>
  );
}
