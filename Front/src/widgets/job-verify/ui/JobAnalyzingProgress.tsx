import { View, Text, ActivityIndicator } from "react-native";
import type { AnalyzingStage } from "@/features/job-verify";

interface Props {
  stage: AnalyzingStage;
}

export function JobAnalyzingProgress({ stage: _stage }: Props) {
  return (
    <View className="bg-card rounded-2xl border border-border p-8 items-center justify-center gap-3">
      <ActivityIndicator size="large" color="#2563EB" />
      <Text className="text-base font-semibold text-text-primary">
        공고 분석 중...
      </Text>
      <Text className="text-xs text-text-secondary">
        잠시만 기다려 주세요
      </Text>
    </View>
  );
}
