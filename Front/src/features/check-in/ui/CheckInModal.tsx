import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  workplaceName: string;
  scheduledTime: string;
  onCheckIn: () => void;
  onDismiss: () => void;
}

/**
 * 출근 팝업 모달 (파란 헤더)
 * 4-2 화면 — 예정 출근 시간, 현재 시각, 근무지 표시
 */
export function CheckInModal({ workplaceName, scheduledTime, onCheckIn, onDismiss }: Props) {
  return (
    <View className="bg-card rounded-3xl overflow-hidden">
      <View className="bg-primary px-4 py-3">
        <Text className="text-text-on-primary font-bold text-lg">출근 알림</Text>
      </View>
      <View className="p-4 gap-2">
        <Text className="text-text-secondary text-sm">근무지: {workplaceName}</Text>
        <Text className="text-text-secondary text-sm">예정 출근: {scheduledTime}</Text>
      </View>
      <View className="flex-row p-4 gap-2">
        <TouchableOpacity
          className="flex-1 py-3 rounded-xl border border-border items-center"
          onPress={onDismiss}
        >
          <Text className="text-text-secondary font-medium">나중에</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-3 rounded-xl bg-primary items-center"
          onPress={onCheckIn}
        >
          <Text className="text-text-on-primary font-bold">출근하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
