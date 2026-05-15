import { View, Text } from "react-native";

interface Props {
  workplaceId: string;
}

/**
 * 근무 대시보드 상세 화면 뷰
 * TODO: AttendanceCardWidget, DashboardWidget 배치 — 그때 _workplaceId의 underscore 제거.
 */
export function WorkDashboardView({ workplaceId: _workplaceId }: Props): JSX.Element {
  return (
    <View className="flex-1 bg-surface px-4 pt-6">
      <Text className="text-2xl font-bold text-text-primary mb-2">
        근무 대시보드
      </Text>
      {/* TODO: AttendanceCardWidget, DashboardWidget */}
    </View>
  );
}
