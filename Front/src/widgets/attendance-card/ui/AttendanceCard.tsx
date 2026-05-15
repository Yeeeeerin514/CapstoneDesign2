import { View, Text } from "react-native";

/**
 * 출퇴근 상태 카드 위젯
 * features/check-in, features/check-out, entities/attendance를 조합
 * TODO: CheckInFeature, CheckOutFeature, AttendanceEntity 연결
 */
export function AttendanceCard() {
  return (
    <View className="bg-card rounded-2xl p-4 shadow-sm border border-border">
      <Text className="text-base font-semibold text-text-primary mb-1">
        현재 근무 상태
      </Text>
      {/* TODO: 실시간 타이머, 출근 시각, LIVE 뱃지 */}
    </View>
  );
}
