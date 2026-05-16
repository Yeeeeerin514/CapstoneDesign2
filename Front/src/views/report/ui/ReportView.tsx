import { View, Text } from "react-native";
import { ScreenHeader } from "@/shared/ui";

/**
 * 신고 탭 화면 뷰
 * TODO: ReportEmptyState, ReportListWidget 배치
 */
export function ReportView() {
  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader showLogo />
      <View className="px-4 pt-6">
        <Text className="text-2xl font-bold text-text-primary mb-2">신고</Text>
        {/* TODO: ReportEmptyState, ReportListWidget */}
      </View>
    </View>
  );
}
