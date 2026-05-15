import { View, Text } from "react-native";

/**
 * 계약서 분석 결과 위젯
 * features/contract-upload, entities/contract를 조합
 * TODO: 분석 요약 카드, 위험도 배지, 이슈 탭 구현
 */
export function ContractAnalysisResult() {
  return (
    <View className="bg-card rounded-2xl p-4 border border-border">
      <Text className="text-base font-semibold text-text-primary mb-2">
        계약서 분석 결과
      </Text>
      {/* TODO: 분석 요약, 발견 이슈, 법률 가이드 탭 */}
    </View>
  );
}
