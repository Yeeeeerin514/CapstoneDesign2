import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  totalWorkTime: string;
  onCheckOut: () => void;
  onOvertime: () => void;
  onDismiss: () => void;
}

/**
 * 퇴근 팝업 모달 (주황 헤더)
 * 4-4 화면 — 총 근무시간, 현재 시각 표시
 */
export function CheckOutModal({ totalWorkTime, onCheckOut, onOvertime, onDismiss }: Props) {
  return (
    <View className="bg-card rounded-3xl overflow-hidden">
      <View className="bg-warning px-4 py-3">
        <Text className="text-text-on-primary font-bold text-lg">퇴근 알림</Text>
      </View>
      <View className="p-4">
        <Text className="text-text-secondary text-sm">총 근무시간: {totalWorkTime}</Text>
      </View>
      <View className="flex-row p-4 gap-2">
        <TouchableOpacity
          className="flex-1 py-3 rounded-xl border border-border items-center"
          onPress={onDismiss}
        >
          <Text className="text-text-secondary font-medium">나중에</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-3 rounded-xl border border-warning items-center"
          onPress={onOvertime}
        >
          <Text className="text-warning font-medium">연장근무</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-3 rounded-xl bg-warning items-center"
          onPress={onCheckOut}
        >
          <Text className="text-text-on-primary font-bold">퇴근하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
