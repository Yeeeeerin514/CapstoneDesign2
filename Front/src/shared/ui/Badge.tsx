import { View, Text } from "react-native";
import { cn } from "@/shared/lib/utils";

/**
 * 위험도 색상 토큰.
 * - danger:  🔴 위법 (빨강)
 * - caution: 🟡 주의 (노랑)
 * - info:    🔵 참고 (파랑)
 * - success: ✅ 이상없음/완료 (초록)
 */
export type BadgeTone = "danger" | "caution" | "info" | "success";

interface Props {
  label: string;
  tone: BadgeTone;
}

const containerByTone: Record<BadgeTone, string> = {
  danger: "bg-badge-danger",
  caution: "bg-badge-caution",
  info: "bg-badge-info",
  success: "bg-badge-success",
};

const textByTone: Record<BadgeTone, string> = {
  danger: "text-danger-dark",
  caution: "text-caution-dark",
  info: "text-info-dark",
  success: "text-success-dark",
};

export function Badge({ label, tone }: Props): JSX.Element {
  return (
    <View
      className={cn(
        "self-start px-2 py-1 rounded-full",
        containerByTone[tone],
      )}
    >
      <Text className={cn("text-xs font-semibold", textByTone[tone])}>
        {label}
      </Text>
    </View>
  );
}
