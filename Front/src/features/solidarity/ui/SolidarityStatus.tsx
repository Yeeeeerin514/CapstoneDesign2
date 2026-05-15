import { View, Text } from "react-native";
import { Badge, Card } from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/utils";
import type { SolidarityGroup } from "../model/types";

interface Props {
  group: SolidarityGroup;
}

/** 5-3 화면 — 연대 현황. 어른(대표자) 안내 카드 별도 표시. */
export function SolidarityStatus({ group }: Props): JSX.Element {
  const leader = group.participants.find((p) => p.isLeader);

  return (
    <View className="gap-3">
      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-text-primary">
            {group.workplaceName} 연대
          </Text>
          <Badge label={`${group.participants.length}명 참여`} tone="info" />
        </View>
        <Text className="text-sm text-text-secondary mt-1">
          총 체불액 {formatCurrency(group.totalUnpaidAmount)}
        </Text>
      </Card>

      <Card>
        <Text className="text-sm font-semibold text-text-primary mb-2">
          참여자 명단
        </Text>
        <View className="gap-1">
          {group.participants.map((p) => (
            <View
              key={p.userId}
              className="flex-row items-center justify-between"
            >
              <Text className="text-sm text-text-primary">
                {p.nickname}
                {p.isLeader && " · 어른"}
              </Text>
              <Text className="text-sm text-text-secondary">
                {formatCurrency(p.unpaidAmount)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {leader !== undefined && (
        <Card className="border-primary">
          <Text className="text-sm font-semibold text-primary mb-1">
            🛡 어른 시스템 안내
          </Text>
          <Text className="text-xs text-text-secondary">
            체불액 최고액자({leader.nickname})가 어른으로 자동 지정되었어요.
          </Text>
          <Text className="text-xs text-text-secondary mt-1">
            · 진정서 대표 서명권 · 노동청 우선 처리 · 멘토 매칭 +20% 가중치
          </Text>
        </Card>
      )}
    </View>
  );
}
