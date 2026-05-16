import { View, Text } from "react-native";
import { Button, Card } from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/utils";
import type { MentorProfile } from "@/entities/mentor";

interface Props {
  mentor: MentorProfile;
  estimatedRecoveryAmount: number;
  isAgreed: boolean;
  isProcessing: boolean;
  onToggleAgreement: () => void;
  onSubmit: () => void;
}

/** M-2 화면 — 에스크로 결제. */
export function EscrowCheckout({
  mentor,
  estimatedRecoveryAmount,
  isAgreed,
  isProcessing,
  onToggleAgreement,
  onSubmit,
}: Props): JSX.Element {
  return (
    <View className="gap-3">
      <Card>
        <Text className="text-sm font-semibold text-text-primary mb-1">
          에스크로 결제
        </Text>
        <Text className="text-xs text-text-secondary">
          결제 금액은 즉시 멘토에게 전달되지 않고, 사건 해결 확인 후 정산됩니다.
        </Text>
      </Card>

      <Card>
        <Text className="text-sm text-text-secondary">결제 금액</Text>
        <Text className="text-3xl font-bold text-primary">
          {formatCurrency(mentor.consultingFee)}
        </Text>
        <Text className="text-xs text-text-secondary mt-2">
          해결 시 회수 가능 금액: {formatCurrency(estimatedRecoveryAmount)}
        </Text>
      </Card>

      <Button
        onPress={onToggleAgreement}
        variant="secondary"
        fullWidth
      >
        {isAgreed ? "✓ 약관에 동의했어요" : "약관에 동의합니다"}
      </Button>
      <Button
        onPress={onSubmit}
        isDisabled={!isAgreed || isProcessing}
        isLoading={isProcessing}
        fullWidth
      >
        {isProcessing ? "결제 처리 중..." : "결제하기"}
      </Button>
    </View>
  );
}
