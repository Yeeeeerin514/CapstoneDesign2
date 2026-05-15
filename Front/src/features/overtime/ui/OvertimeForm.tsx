import { View, Text, TouchableOpacity } from "react-native";
import { useOvertimeStore } from "../model/store";

/**
 * 연장근무 설정 화면 (4-5)
 * 연장 시간 선택, 빠른 선택 버튼, 새 퇴근 예정 시간 실시간 계산
 */
export function OvertimeForm() {
  const { extraHours, extraMinutes, setExtraMinutes, setExtraHours } = useOvertimeStore();

  const quickOptions: Array<{ label: string; minutes: number }> = [
    { label: "30분", minutes: 30 },
    { label: "1시간", minutes: 60 },
    { label: "1시간 30분", minutes: 90 },
    { label: "2시간", minutes: 120 },
  ];

  function handleQuickSelect(minutes: number): void {
    setExtraHours(Math.floor(minutes / 60));
    setExtraMinutes(minutes % 60);
  }

  return (
    <View className="flex-1 bg-surface px-4 pt-6">
      <Text className="text-2xl font-bold text-text-primary mb-6">연장근무 설정</Text>
      {/* 빠른 선택 버튼 */}
      <View className="flex-row flex-wrap gap-2 mb-6">
        {quickOptions.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            className="px-4 py-2 rounded-xl border border-border bg-card"
            onPress={() => handleQuickSelect(opt.minutes)}
          >
            <Text className="text-text-primary font-medium">{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* 선택된 연장 시간 표시 */}
      <Text className="text-center text-3xl font-bold text-warning">
        {extraHours}시간 {extraMinutes}분
      </Text>
      {/* TODO: [연장근무 확정] 버튼 */}
    </View>
  );
}
