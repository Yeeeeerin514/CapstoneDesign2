import { View, Text } from "react-native";

/**
 * 근무기록 목록 화면 뷰
 * TODO: WorkRecordListWidget 배치
 */
export function WorkRecordView() {
  return (
    <View className="flex-1 bg-surface px-4 pt-6">
      <Text className="text-2xl font-bold text-text-primary mb-1">근무 대시보드</Text>
      <Text className="text-sm text-text-secondary mb-4">
        자동으로 기록된 근무 시간과 수당을 확인하세요.
      </Text>
      {/* TODO: WorkRecordListWidget */}
    </View>
  );
}
