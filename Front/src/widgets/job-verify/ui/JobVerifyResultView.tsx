import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, type BadgeTone } from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/utils";
import type { IssueSeverity } from "@/entities/contract";
import type { JobIssue, JobVerifyResult } from "@/features/job-verify";

interface Props {
  result: JobVerifyResult;
  isRegistering: boolean;
  onRegister: () => void;
  onRetry: () => void;
}

const SEVERITY_META: Record<
  IssueSeverity,
  { label: string; tone: BadgeTone }
> = {
  danger: { label: "🔴 위법", tone: "danger" },
  caution: { label: "🟡 주의", tone: "caution" },
  info: { label: "🔵 참고", tone: "info" },
};

function IssueCard({ issue }: { issue: JobIssue }) {
  const meta = SEVERITY_META[issue.severity];
  return (
    <Card>
      <View className="gap-2">
        <Badge label={meta.label} tone={meta.tone} />
        <Text className="text-base font-semibold text-text-primary">
          {issue.title}
        </Text>
        <Text className="text-sm text-text-secondary">
          {issue.description}
        </Text>
        <Text className="text-xs text-text-secondary">
          법적 근거 · {issue.legalBasis}
        </Text>
        <Text className="text-xs text-info-dark">
          권고 · {issue.recommendation}
        </Text>
      </View>
    </Card>
  );
}

interface InfoRowProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  tone?: BadgeTone;
}

function InfoRow({ icon, label, value, tone }: InfoRowProps) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={16} color="#475569" />
        <Text className="text-sm text-text-secondary">{label}</Text>
      </View>
      {tone !== undefined ? (
        <Badge label={value} tone={tone} />
      ) : (
        <Text className="text-sm font-semibold text-text-primary">{value}</Text>
      )}
    </View>
  );
}

export function JobVerifyResultView({
  result,
  isRegistering,
  onRegister,
  onRetry,
}: Props) {
  const hasIssues = result.issues.length > 0;
  const canRegister =
    result.workplaceName !== null &&
    result.workplaceName.length > 0 &&
    result.hourlyWage !== null;

  const wageText =
    result.hourlyWage !== null ? formatCurrency(result.hourlyWage) : "-";
  const operationalText = result.operationalStatus ?? "확인 불가";
  const arrearsText = result.wageArrearsHistory ?? "확인 불가";
  const arrearsTone: BadgeTone | undefined =
    result.wageArrearsHistory === "없음" ? "success" : undefined;
  const operationalTone: BadgeTone | undefined =
    result.operationalStatus === "정상 운영" ? "success" : undefined;

  return (
    <View className="gap-3">
      <Card>
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="storefront" size={20} color="#2563EB" />
            <Text className="text-lg font-bold text-text-primary">
              {result.workplaceName ?? "사업장 정보 없음"}
            </Text>
          </View>

          <View className="h-px bg-border" />

          <View>
            <InfoRow icon="cash-outline" label="시급" value={wageText} />
            <InfoRow
              icon="checkmark-circle-outline"
              label="상태"
              value={operationalText}
              tone={operationalTone}
            />
            <InfoRow
              icon="alert-circle-outline"
              label="체불이력"
              value={arrearsText}
              tone={arrearsTone}
            />
          </View>
        </View>
      </Card>

      {result.analysisSummary !== null && (
        <Card>
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Ionicons name="document-text-outline" size={16} color="#2563EB" />
              <Text className="text-sm font-semibold text-text-primary">
                분석 결과
              </Text>
            </View>
            <Text className="text-sm leading-5 text-text-secondary">
              {result.analysisSummary}
            </Text>
          </View>
        </Card>
      )}

      {hasIssues && (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-text-primary mt-1">
            세부 이슈
          </Text>
          {result.issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </View>
      )}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            variant="secondary"
            onPress={onRetry}
            fullWidth
            children={"다시 분석"}
          />
        </View>
        <View className="flex-1">
          <Button
            onPress={onRegister}
            isDisabled={!canRegister}
            isLoading={isRegistering}
            fullWidth
            children={"관심업장으로 등록"}
          />
        </View>
      </View>
    </View>
  );
}
