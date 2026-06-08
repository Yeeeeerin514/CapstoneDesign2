import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useReportStore } from "@/features/report-submit";
import { PAYMENT_DISTRIBUTION } from "@/shared/lib/payment";

interface ResolveSuccessViewProps {
  caseId: string;
  /** "✍️ 해결 후기 남기기" — ReviewWriteView로 이동. */
  onWriteReview: () => void;
  /** "나중에 할게요" — 상위가 신고 탭으로 복귀 처리. */
  onSkip: () => void;
}

/**
 * 사건 해결 직후 노출되는 축하 + 후기 작성 유도 화면.
 *  - 사건 메타(업장명/수령액/해결일) 요약
 *  - 멘토 매칭 환급금 안내 (자동 처리됨)
 *  - 핵심 CTA: "해결 후기 남기기"
 *  - 보조: "나중에 할게요" → 신고 탭 카드에서 다시 진입 가능
 */
export function ResolveSuccessView({
  caseId,
  onWriteReview,
  onSkip,
}: ResolveSuccessViewProps): JSX.Element | null {
  const reportCase = useReportStore((s) =>
    s.cases.find((c) => c.id === caseId),
  );
  if (reportCase === undefined) return null;

  const resolvedDate =
    reportCase.resolvedAt !== undefined
      ? reportCase.resolvedAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      <ScreenHeader showLogo />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* 성공 헤더 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 24,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#DCFCE7",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 42 }}>💚</Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 6,
              textAlign: "center",
            }}
          >
            임금을 돌려받으셨네요!
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#475569",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {`${reportCase.workplaceName} 사건이\n해결로 처리되었습니다.`}
          </Text>

          <View
            style={{
              width: "100%",
              backgroundColor: "#F8FAFC",
              borderRadius: 10,
              padding: 12,
              marginTop: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 12, color: "#64748B" }}>해결일</Text>
              <Text
                style={{ fontSize: 12, fontWeight: "600", color: "#0F172A" }}
              >
                {resolvedDate}
              </Text>
            </View>
            {reportCase.calculatedUnpaid !== null ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  수령 완료 금액
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#16A34A",
                  }}
                >
                  {`₩${reportCase.calculatedUnpaid.toLocaleString()}`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 환급 안내 */}
        <View
          style={{
            backgroundColor: "#EFF6FF",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            flexDirection: "row",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="information-circle"
            size={16}
            color="#1D4ED8"
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              color: "#1E40AF",
              lineHeight: 18,
            }}
          >
            {`💰 멘토 매칭 결제 이력이 있으면 멘토에게 성과보수 ₩${PAYMENT_DISTRIBUTION.mentorBonus.toLocaleString()}이 자동 지급됩니다.`}
          </Text>
        </View>

        {/* 후기 CTA 본문 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 8,
              textAlign: "center",
              lineHeight: 23,
            }}
          >
            {"당신의 경험이 다른 알바생에게\n큰 힘이 됩니다"}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#475569",
              lineHeight: 20,
              textAlign: "center",
              marginBottom: 18,
            }}
          >
            {
              "어떻게 해결했는지 남겨주시면\n비슷한 상황의 분들이 도움받을 수 있어요.\n후기를 쓰면 멘토로도 활동할 수 있어요."
            }
          </Text>

          <Pressable
            onPress={onWriteReview}
            style={{
              backgroundColor: "#16A34A",
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
              marginBottom: 8,
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
            <Text
              style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
            >
              해결 후기 남기기
            </Text>
          </Pressable>

          <Pressable
            onPress={onSkip}
            style={{
              paddingVertical: 11,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#888888", fontSize: 13 }}>
              나중에 할게요
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            fontSize: 11,
            color: "#94A3B8",
            textAlign: "center",
            lineHeight: 16,
          }}
        >
          {"나중에 신고 탭의 해결된 사건 카드에서도\n후기를 작성할 수 있어요."}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
