import { View, Text, Pressable } from "react-native";
import { Badge, type BadgeTone } from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/utils";
import type { Workplace, WorkplaceStatus } from "../model/types";

interface Props {
  workplace: Workplace;
  onPress?: () => void;
}

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

const STATUS_META: Record<WorkplaceStatus, StatusMeta> = {
  "contract-pending": { label: "계약서 미업로드", tone: "danger" },
  "contract-analyzed": { label: "계약서 분석 완료", tone: "info" },
  "bssid-pending": { label: "BSSID 미등록", tone: "caution" },
  registered: { label: "등록 완료", tone: "success" },
};

/** 관심업장 목록(2-1-1) 카드. 표현 전용 — 비즈니스 로직 금지. */
export function WorkplaceCard({ workplace, onPress }: Props): JSX.Element {
  const meta = STATUS_META[workplace.status];
  return (
    <Pressable
      onPress={onPress}
      className="bg-card rounded-2xl border border-border p-4 gap-2"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-text-primary">
          {workplace.name}
        </Text>
        <Badge label={meta.label} tone={meta.tone} />
      </View>
      <Text className="text-xs text-text-secondary">
        시급 {formatCurrency(workplace.hourlyWage)}
      </Text>
    </Pressable>
  );
}
