import { View, Text, Pressable } from "react-native";
import { Button, Card } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import type { ReportEvidence } from "@/entities/report";

interface Props {
  evidences: ReportEvidence[];
  isSolidarity: boolean;
  isSubmitting: boolean;
  onAddEvidence: () => void;
  onToggleSolidarity: () => void;
  onSubmit: () => void;
}

/** 5-2 화면 — 증거 업로드 + 연대 토글. */
export function ReportSubmitForm({
  evidences,
  isSolidarity,
  isSubmitting,
  onAddEvidence,
  onToggleSolidarity,
  onSubmit,
}: Props): JSX.Element {
  return (
    <View className="gap-3">
      <Card>
        <Text className="text-base font-semibold text-text-primary mb-2">
          증거 자료
        </Text>
        {evidences.length === 0 ? (
          <Text className="text-xs text-text-secondary">
            BSSID 근무 기록과 근로계약서가 자동 첨부됩니다.
          </Text>
        ) : (
          <View className="gap-1">
            {evidences.map((e) => (
              <Text key={e.id} className="text-sm text-text-primary">
                {e.autoCollected ? "✓ " : "• "}
                {e.label}
              </Text>
            ))}
          </View>
        )}
        <Pressable
          onPress={onAddEvidence}
          className="py-2 items-center rounded-xl border border-border mt-3"
        >
          <Text className="text-text-secondary text-sm">+ 추가 증거 업로드</Text>
        </Pressable>
      </Card>

      <Pressable
        onPress={onToggleSolidarity}
        className={cn(
          "p-4 rounded-2xl border",
          isSolidarity
            ? "border-primary bg-primary-light"
            : "border-border bg-card",
        )}
      >
        <Text className="text-sm font-semibold text-text-primary">
          {isSolidarity ? "✓ 연대하여 함께 신고" : "연대하여 함께 신고하기"}
        </Text>
        <Text className="text-xs text-text-secondary mt-1">
          같은 사업장 피해자가 더 있다면 함께 신고할 수 있어요.
        </Text>
      </Pressable>

      <Button
        onPress={onSubmit}
        isDisabled={isSubmitting}
        isLoading={isSubmitting}
        fullWidth
      >
        {isSubmitting ? "진정서 생성 중..." : "진정서 미리보기 →"}
      </Button>
    </View>
  );
}
