import { View, Text, Pressable } from "react-native";
import { Badge } from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/utils";
import type { MentorProfile } from "@/entities/mentor";

interface Props {
  mentor: MentorProfile;
  onPress: () => void;
}

/** M-1 화면 — 멘토 추천 카드. similarity가 있으면 배지로 표시. */
export function MentorCard({ mentor, onPress }: Props): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      className="bg-card rounded-2xl border border-border p-4 gap-2"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-text-primary">
          {mentor.nickname}
        </Text>
        {mentor.similarity !== undefined && (
          <Badge label={`유사도 ${mentor.similarity}%`} tone="info" />
        )}
      </View>
      <Text className="text-xs text-text-secondary">
        업종: {mentor.industries.join(", ")} · 해결 {mentor.resolvedCases}건 · ★{" "}
        {mentor.rating.toFixed(1)}
      </Text>
      <Text className="text-sm font-semibold text-primary">
        상담료 {formatCurrency(mentor.consultingFee)}
      </Text>
    </Pressable>
  );
}
