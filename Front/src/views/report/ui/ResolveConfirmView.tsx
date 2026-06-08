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

/**
 * 임금 수령 확정 화면.
 *  - "네, 받았어요" → 사건 RESOLVED + 멘토 성과보수(₩4,000) 추가 지급.
 *  - "아직 못 받았어요" → 사건 상세로 복귀 (상태 변경 없음). 미해결 종결은
 *    상세 화면의 별도 "미해결로 종결하기" 액션에서만 트리거.
 */
export function ResolveConfirmView({
  caseId,
  onBack,
  onAfterResolved,
}: ResolveConfirmViewProps): JSX.Element {
  const updateCaseStatus = useReportStore((s) => s.updateCaseStatus);
  const settleOnResolved = usePaymentStore((s) => s.settleOnResolved);

  const handleConfirmResolved = async (): Promise<void> => {
    // 1. 사건 상태 RESOLVED로 변경 (resolvedAt 자동 채움)
    updateCaseStatus(caseId, "RESOLVED");

    // 2. 이 사건에 연결된 결제 기록 찾기
    const payments = usePaymentStore.getState().records;
    const relatedPayment = payments.find(
      (p) => p.caseId === caseId && p.status === "paid",
    );

    // 3. 결제 기록 있으면 멘토 성과보수 즉시 지급
    if (relatedPayment !== undefined) {
      await settleOnResolved(relatedPayment.id);
      Alert.alert(
        "해결 확인",
        `멘토에게 성과보수 ₩${PAYMENT_DISTRIBUTION.mentorBonus.toLocaleString()}이 지급되었습니다.\n함께 해결해주신 멘토에게 고마움을 전해주세요.`,
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

  const handleStillWaiting = (): void => {
    // "아직 못 받았어요" — 상태 변경 없이 사건 상세로 복귀.
    onBack();
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
          onPress={handleStillWaiting}
          style={{
            backgroundColor: "#FFFFFF",
            paddingVertical: 13,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#CBD5E1",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Text
            style={{ color: "#475569", fontSize: 14, fontWeight: "600" }}
          >
            아직 못 받았어요
          </Text>
        </Pressable>

        {/* 멘토 성과보수 안내 */}
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
            {`멘토 매칭 결제 이력이 있으면 해결 확인 시 멘토에게 성과보수 ₩${PAYMENT_DISTRIBUTION.mentorBonus.toLocaleString()}이 자동 지급됩니다.`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
