import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useReportStore } from "@/features/report-submit";
import { usePaymentStore } from "@/features/payment";
import { PAYMENT_DISTRIBUTION } from "@/shared/lib/payment";

interface ResolveConfirmViewProps {
  caseId: string;
  onBack: () => void;
  /** 해결 후 후기 작성 안내로 진행할 때 호출. */
  onAfterResolved?: () => void;
}

export function ResolveConfirmView({
  caseId,
  onBack,
  onAfterResolved,
}: ResolveConfirmViewProps): JSX.Element {
  const updateCaseStatus = useReportStore((s) => s.updateCaseStatus);
  const refundAfterResolved = usePaymentStore((s) => s.refundAfterResolved);

  const handleConfirmResolved = async (): Promise<void> => {
    // 1. 사건 상태 resolved로 변경 (resolvedAt 자동 채움)
    updateCaseStatus(caseId, "resolved");

    // 2. 이 사건에 연결된 결제 기록 찾기
    const payments = usePaymentStore.getState().records;
    const relatedPayment = payments.find(
      (p) => p.caseId === caseId && p.status === "paid",
    );

    // 3. 결제 기록 있으면 즉시 환급 처리
    if (relatedPayment !== undefined) {
      await refundAfterResolved(relatedPayment.id);
      Alert.alert(
        "해결 확인",
        `₩${PAYMENT_DISTRIBUTION.menteeRefund.toLocaleString()}이 환급되었습니다.\n경험을 나눠 다른 분들을 도와주세요.`,
        [
          {
            text: "확인",
            onPress: () => {
              if (onAfterResolved !== undefined) onAfterResolved();
              else onBack();
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      "해결 확인",
      "사건이 해결됨으로 처리되었습니다.\n경험을 나눠 다른 분들을 도와주세요.",
      [
        {
          text: "확인",
          onPress: () => {
            if (onAfterResolved !== undefined) onAfterResolved();
            else onBack();
          },
        },
      ],
    );
  };

  const handleUnresolved = (): void => {
    // 의도적으로 비어있음 — 화면 그대로 유지, 상태 변경 없음.
    // 추후 별도 UnresolvedGuide 화면이 생기면 이 함수에 진입 로직 추가.
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      <ScreenHeader showLogo />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          gap: 8,
        }}
      >
        <Pressable onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          사건 해결 확인
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
      >
        {/* 안내 카드 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 24,
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#DCFCE7",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="cash-outline" size={32} color="#16A34A" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 6,
              textAlign: "center",
            }}
          >
            임금을 실제로 받으셨나요?
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#64748B",
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            노동청 종결 통보 + 실제 입금 여부를 함께 확인합니다.
            {"\n"}
            체불 임금등·사업주 확인서 발급은 "해결됨"이 아닙니다.
          </Text>
        </View>

        {/* 액션 */}
        <Pressable
          onPress={() => void handleConfirmResolved()}
          style={{
            backgroundColor: "#16A34A",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            marginBottom: 10,
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text
            style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
          >
            네, 받았어요
          </Text>
        </Pressable>

        <Pressable
          onPress={handleUnresolved}
          style={{
            backgroundColor: "#FFFFFF",
            paddingVertical: 13,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: "#DC2626",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Ionicons name="warning-outline" size={16} color="#DC2626" />
          <Text
            style={{ color: "#DC2626", fontSize: 14, fontWeight: "600" }}
          >
            아직 못 받았어요
          </Text>
        </Pressable>

        {/* 환급 안내 */}
        <View
          style={{
            backgroundColor: "#EFF6FF",
            borderRadius: 10,
            padding: 12,
            marginTop: 16,
            flexDirection: "row",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={14}
            color="#1D4ED8"
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 11,
              color: "#1E40AF",
              lineHeight: 17,
            }}
          >
            {`멘토 매칭 결제 이력이 있으면 해결 확인 시 ₩${PAYMENT_DISTRIBUTION.menteeRefund.toLocaleString()}이 자동 환급됩니다.`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
