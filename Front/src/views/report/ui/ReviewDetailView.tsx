import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useReviewStore } from "@/entities/review";

interface ReviewDetailViewProps {
  reviewId: string;
  onBack: () => void;
  onConnectMentor?: () => void;
}

export function ReviewDetailView({
  reviewId,
  onBack,
  onConnectMentor,
}: ReviewDetailViewProps): JSX.Element | null {
  const review = useReviewStore((s) => s.getById(reviewId));
  const markHelpful = useReviewStore((s) => s.markHelpful);

  if (review === undefined) {
    return null;
  }

  const handleHelpful = (): void => {
    markHelpful(review.id);
  };

  const handleMentorConnect = (): void => {
    if (onConnectMentor !== undefined) {
      onConnectMentor();
      return;
    }
    Alert.alert("준비 중", "멘토 연결 기능은 곧 출시됩니다.");
  };

  const tipRows: Array<{ label: string; text: string }> = [
    { label: "진정서 작성 팁", text: review.tips.complaint },
    { label: "출석조사 팁", text: review.tips.investigation },
    { label: "사업주 협상 팁", text: review.tips.negotiation },
  ].filter((t) => t.text.length > 0);

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
          후기 상세
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 0,
          paddingBottom: 32,
        }}
      >
        {/* 메타 헤더 카드 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
            >
              {review.rating.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 12, color: "#CBD5E1" }}>·</Text>
            <Text style={{ fontSize: 12, color: "#64748B" }}>
              {review.industry}
            </Text>
            <Text style={{ fontSize: 12, color: "#CBD5E1" }}>·</Text>
            <Text style={{ fontSize: 12, color: "#64748B" }}>
              {review.region}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#0F172A",
              lineHeight: 26,
              marginBottom: 10,
            }}
          >
            {review.title}
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {review.authorBadges.map((b) => (
              <View
                key={b}
                style={{
                  backgroundColor: "#E8F2FF",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{ fontSize: 10, color: "#1B64DA", fontWeight: "600" }}
                >
                  {b}
                </Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 12, color: "#475569" }}>
            {`by ${review.authorNickname}`}
          </Text>
        </View>

        {/* 사건 요약 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#475569",
              marginBottom: 10,
            }}
          >
            사건 요약
          </Text>
          {[
            { label: "피해 유형", value: review.damageType },
            { label: "피해 금액", value: review.unpaidAmountRange },
            { label: "해결 기간", value: `${review.resolveDays}일` },
          ].map((row) => (
            <View
              key={row.label}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 12, color: "#64748B" }}>
                {row.label}
              </Text>
              <Text
                style={{ fontSize: 13, color: "#0F172A", fontWeight: "500" }}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* 해결 타임라인 (간이 시각화) */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#475569",
              marginBottom: 10,
            }}
          >
            해결 타임라인
          </Text>
          {["진정 접수", "감독관 배정", "출석조사", "시정지시", "해결"].map(
            (label, idx, arr) => (
              <View
                key={label}
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 6,
                  alignItems: "flex-start",
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: "#3182F6",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  </View>
                  {idx < arr.length - 1 ? (
                    <View
                      style={{
                        width: 2,
                        height: 18,
                        backgroundColor: "#3182F6",
                        marginTop: 2,
                      }}
                    />
                  ) : null}
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#0F172A",
                    marginTop: 1,
                  }}
                >
                  {label}
                </Text>
              </View>
            ),
          )}
        </View>

        {/* 내가 한 일 (노하우) */}
        {tipRows.length > 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#475569",
                marginBottom: 12,
              }}
            >
              내가 한 일
            </Text>
            {tipRows.map((row, idx) => (
              <View
                key={row.label}
                style={{
                  paddingTop: idx === 0 ? 0 : 12,
                  paddingBottom: 12,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#1B64DA",
                    marginBottom: 4,
                  }}
                >
                  {row.label}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#0F172A",
                    lineHeight: 19,
                  }}
                >
                  {row.text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* 자유 서술 */}
        {review.content.length > 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#475569",
                marginBottom: 8,
              }}
            >
              경험 공유
            </Text>
            <Text
              style={{ fontSize: 13, color: "#0F172A", lineHeight: 20 }}
            >
              {review.content}
            </Text>
          </View>
        ) : null}

        {/* 도움됐어요 */}
        <Pressable
          onPress={handleHelpful}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            paddingVertical: 11,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <Ionicons name="thumbs-up-outline" size={14} color="#475569" />
          <Text
            style={{ fontSize: 13, fontWeight: "500", color: "#475569" }}
          >
            {`도움됐어요 ${review.helpfulCount}`}
          </Text>
        </Pressable>

        {/* 멘토 연결 (isMentor=true만) */}
        {review.isMentor ? (
          <Pressable
            onPress={handleMentorConnect}
            style={{
              backgroundColor: "#3182F6",
              paddingVertical: 13,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
            >
              이 분과 1:1 멘토 매칭하기 · ₩10,000
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
