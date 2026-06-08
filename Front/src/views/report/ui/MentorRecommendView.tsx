import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useMentorStore } from "@/features/mentor-match";
import type { MentorProfile } from "@/entities/mentor";
import { usePaymentStore } from "@/features/payment";
import { PAYMENT_DISTRIBUTION } from "@/shared/lib/payment";
import { useAuthStore } from "@/entities/user/model/auth-store";
import type { DamageTypeEnum } from "@/entities/report";

interface MentorRecommendViewProps {
  caseId: string;
  industry: string;
  damageTypes: string[];
  onBack: () => void;
  onStartChat?: (mentor: MentorProfile) => void;
}

type Mode = "list" | "confirm" | "success";

function getMatchReasons(
  mentor: MentorProfile,
  industry: string,
  damageTypes: string[],
): string[] {
  const reasons: string[] = [];
  if (mentor.industry === industry) reasons.push("같은 업종 경험");
  if (mentor.damageTypes.some((d) => damageTypes.includes(d))) {
    reasons.push("같은 피해 유형 경험");
  }
  if (mentor.resolvedDays <= 20) reasons.push("빠른 해결");
  return reasons;
}

export function MentorRecommendView({
  caseId,
  industry,
  damageTypes,
  onBack,
}: MentorRecommendViewProps): JSX.Element {
  const getRecommended = useMentorStore((s) => s.getRecommended);
  const chargeMentorFee = usePaymentStore((s) => s.chargeMentorFee);
  const isPaymentLoading = usePaymentStore((s) => s.isLoading);
  const menteeId = useAuthStore((s) => s.userIdString);

  const [mode, setMode] = useState<Mode>("list");
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(
    null,
  );
  const [, setShowBrowse] = useState(false);
  void setShowBrowse;

  // 추천 멘토 Top-3 (industry/damageTypes 매칭)
  const recommended = getRecommended(industry, damageTypes);

  const handleSelectMentor = (mentor: MentorProfile): void => {
    setSelectedMentor(mentor);
    setMode("confirm");
  };

  const handleConfirmPay = async (): Promise<void> => {
    if (selectedMentor === null) return;
    const result = await chargeMentorFee({
      menteeId,
      mentorId: selectedMentor.userId,
      caseId,
    });
    if (result.success) {
      setMode("success");
    } else {
      Alert.alert("결제 실패", "다시 시도해주세요.");
    }
  };

  // damageTypes 라벨 → DamageTypeEnum 매핑 (browse 필터 prefill용; 현재 미사용 — 향후 활용)
  void damageTypes.map((d): DamageTypeEnum | null => {
    if (d.includes("주휴")) return "WEEKLY_HOLIDAY";
    if (d.includes("연장")) return "OVERTIME";
    if (d.includes("야간")) return "NIGHT";
    if (d.includes("퇴직")) return "SEVERANCE";
    if (d.includes("임금") || d.includes("체불")) return "BASE_WAGE";
    return null;
  });
  // ───── 리스트 화면 ─────
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
          멘토 찾기
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
        {/* 면책 배너 (항상 표시, 닫기 불가) */}
        <View
          style={{
            backgroundColor: "#F1F5F9",
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            flexDirection: "row",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={14}
            color="#64748B"
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              color: "#64748B",
              lineHeight: 18,
            }}
          >
            이 멘토들은 동료 근로자입니다. 법률 자문이 아닌 경험 공유입니다.
            법적 판단은 공인노무사·변호사에게 받으세요.
          </Text>
        </View>

        {/* 매칭 사유 설명 */}
        <Text
          style={{
            fontSize: 13,
            color: "#475569",
            marginBottom: 12,
            lineHeight: 19,
          }}
        >
          {`${industry} 업종, ${damageTypes.join("·")} 피해를 해결한 멘토를 찾았어요`}
        </Text>

        {/* 전체 멘토 검색 진입 */}
        <Pressable
          onPress={() => setShowBrowse(true)}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            paddingVertical: 11,
            paddingHorizontal: 12,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderWidth: 1,
            borderColor: "#B5D4F4",
          }}
        >
          <Ionicons name="search" size={13} color="#185FA5" />
          <Text
            style={{ fontSize: 13, color: "#185FA5", fontWeight: "600" }}
          >
            추천에 만족하지 못하셨나요? 전체 멘토 검색하기
          </Text>
        </Pressable>

        {recommended.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 24,
              alignItems: "center",
            }}
          >
            <Ionicons name="search-outline" size={32} color="#94A3B8" />
            <Text
              style={{ fontSize: 13, color: "#64748B", marginTop: 8 }}
            >
              매칭되는 멘토를 찾지 못했어요
            </Text>
          </View>
        ) : (
          recommended.map((mentor) => {
            const matchReasons = getMatchReasons(mentor, industry, damageTypes);
            return (
              <View
                key={mentor.userId}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                {/* 닉네임 + 배지 */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}
                  >
                    {mentor.nickname}
                  </Text>
                  {mentor.badges.map((b) => (
                    <View
                      key={b}
                      style={{
                        backgroundColor: "#EBF3FF",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{ fontSize: 10, color: "#1B64DA", fontWeight: "600" }}
                      >
                        {b === "인증멘토" ? "🛡 인증멘토" : "⚡ 빠른해결"}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* 통계 */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#0F172A",
                      fontWeight: "600",
                    }}
                  >
                    {mentor.averageRating.toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#CBD5E1" }}>·</Text>
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    {`후기 ${mentor.reviewCount}개`}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#CBD5E1" }}>·</Text>
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    {`해결까지 ${mentor.resolvedDays}일`}
                  </Text>
                </View>

                {/* bio */}
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 13,
                    color: "#475569",
                    lineHeight: 19,
                    marginBottom: 10,
                  }}
                >
                  {mentor.bio}
                </Text>

                {/* 매칭 이유 태그 */}
                {matchReasons.length > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 4,
                      marginBottom: 12,
                    }}
                  >
                    {matchReasons.map((reason) => (
                      <View
                        key={reason}
                        style={{
                          backgroundColor: "#F1F5F9",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={{ fontSize: 11, color: "#475569" }}
                        >
                          {`✓ ${reason}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* 연결 버튼 */}
                <Pressable
                  onPress={() => handleSelectMentor(mentor)}
                  style={{
                    backgroundColor: "#3182F6",
                    paddingVertical: 11,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {`이 멘토와 연결하기 · ₩${PAYMENT_DISTRIBUTION.total.toLocaleString()}`}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* 결제 확인 모달 */}
      <Modal
        visible={mode === "confirm" && selectedMentor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMode("list")}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 14,
              }}
            >
              멘토 매칭 결제
            </Text>

            <View
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: 10,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 13, color: "#475569" }}>
                  결제 금액
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#0F172A",
                  }}
                >
                  {`₩${PAYMENT_DISTRIBUTION.total.toLocaleString()}`}
                </Text>
              </View>
              <View
                style={{
                  height: 1,
                  backgroundColor: "#E2E8F0",
                  marginBottom: 8,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  멘토 즉시 지급
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  {`₩${PAYMENT_DISTRIBUTION.mentor.toLocaleString()}`}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  사건 해결 시 멘토 성과보수
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#16A34A",
                    fontWeight: "600",
                  }}
                >
                  {`+ ₩${PAYMENT_DISTRIBUTION.mentorBonus.toLocaleString()}`}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{ fontSize: 11, color: "#94A3B8", lineHeight: 16 }}
                >
                  미해결 종결 시 멘티 환급
                </Text>
                <Text
                  style={{ fontSize: 11, color: "#94A3B8", lineHeight: 16 }}
                >
                  {`₩${PAYMENT_DISTRIBUTION.menteeRefund.toLocaleString()}`}
                </Text>
              </View>
            </View>

            {isPaymentLoading ? (
              <View
                style={{
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ActivityIndicator size="small" color="#3182F6" />
                <Text style={{ fontSize: 13, color: "#475569" }}>
                  결제 중...
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => setMode("list")}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Text
                    style={{
                      color: "#475569",
                      fontSize: 14,
                      fontWeight: "500",
                    }}
                  >
                    취소
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleConfirmPay()}
                  style={{
                    flex: 2,
                    paddingVertical: 12,
                    backgroundColor: "#3182F6",
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    결제하기
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
