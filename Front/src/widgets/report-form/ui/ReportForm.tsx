import { View, Text } from "react-native";

/**
 * 진정서 작성 폼 위젯
 * features/report-submit, entities/report, entities/attendance를 조합
 * TODO: 업장 선택, 증거 업로드, 연대하기 섹션 구현
 */
export function ReportForm() {
  return (
    <View className="bg-card rounded-2xl p-4 border border-border">
      <Text className="text-base font-semibold text-text-primary mb-2">
        진정서 작성
      </Text>
      {/* TODO: 증거 업로드, 체불액 계산, 연대하기 섹션 */}
    </View>
  );
}
