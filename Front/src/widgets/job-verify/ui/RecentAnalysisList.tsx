import { View, Text } from "react-native";
import { Badge, Card, type BadgeTone } from "@/shared/ui";
import { formatDateTime, parseIso } from "@/shared/lib/format-date";
import type { IssueSeverity } from "@/entities/contract";
import type { RecentAnalysis } from "@/features/job-verify";

interface Props {
  items: RecentAnalysis[];
}

const SEVERITY_TONE: Record<IssueSeverity, BadgeTone> = {
  danger: "danger",
  caution: "caution",
  info: "info",
};

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  danger: "위법",
  caution: "주의",
  info: "참고",
};

export function RecentAnalysisList({ items }: Props) {
  return (
    <View className="gap-3">
      <Text className="text-base font-semibold text-text-primary">
        최근 분석 공고
      </Text>
      {items.length === 0 ? (
        <Card>
          <Text className="text-sm text-text-secondary">
            아직 분석 기록이 없어요. 공고를 업로드해 분석을 시작해보세요.
          </Text>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <View className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-text-primary">
                  {item.workplaceName ?? "사업장 정보 없음"}
                </Text>
                {item.topSeverity !== null && (
                  <Badge
                    label={SEVERITY_LABEL[item.topSeverity]}
                    tone={SEVERITY_TONE[item.topSeverity]}
                  />
                )}
              </View>
              <Text className="text-xs text-text-secondary">
                이슈 {item.issueCount}건 · {formatDateTime(parseIso(item.analyzedAt))}
              </Text>
            </View>
          </Card>
        ))
      )}
    </View>
  );
}
