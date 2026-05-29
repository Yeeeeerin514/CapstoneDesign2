import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useReviewStore } from "@/entities/review";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { useMentorStore } from "@/features/mentor-match";
import { useGroupStore } from "@/features/co-action";
import { useReportStore } from "@/features/report-submit";
import { calcMentorScore, type MentorProfile } from "@/entities/mentor";
import { calcResolveDays, getAmountRange } from "@/shared/lib/utils";
import type { ReportCase } from "@/entities/report";

interface ReviewWriteViewProps {
  /** 해결된 사건 (auto-fill 소스). 없으면 진입 차단 안내. */
  resolvedCase?: ReportCase;
  onBack: () => void;
}

const MAX_TITLE = 30;
const MAX_CONTENT = 500;

export function ReviewWriteView({
  resolvedCase,
  onBack,
}: ReviewWriteViewProps): JSX.Element {
  const addReview = useReviewStore((s) => s.addReview);
  const setHasWrittenReview = useReportStore((s) => s.setHasWrittenReview);
  const nickname = useAuthStore((s) => s.nickname);
  const userId = useAuthStore((s) => s.userIdString);

  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tipComplaint, setTipComplaint] = useState<string>("");
  const [tipInvestigation, setTipInvestigation] = useState<string>("");
  const [tipNegotiation, setTipNegotiation] = useState<string>("");
  const [registerAsMentor, setRegisterAsMentor] = useState<boolean>(false);

  // 진입 차단 — 해결된 사건이 없을 때
  if (resolvedCase === undefined) {
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
            후기 쓰기
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
          <Text
            style={{
              fontSize: 15,
              color: "#0F172A",
              fontWeight: "600",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            아직 해결된 사건이 없어요
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#64748B",
              marginTop: 4,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            사건이 해결되면 후기를 작성하실 수 있습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // reportCase의 실제 필드에서 자동 입력. PoC fallback도 보존.
  const autoIndustry = resolvedCase.industry;
  const autoRegion = resolvedCase.region;
  const autoDamageType = resolvedCase.damageTypes[0] ?? "임금체불";
  const autoResolveDays =
    calcResolveDays({
      createdAt: resolvedCase.createdAt,
      resolvedAt: resolvedCase.resolvedAt,
    }) || 18;

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const canSubmit = trimmedTitle.length > 0 && trimmedContent.length > 0;

  const handleSubmit = (): void => {
    if (!canSubmit) {
      Alert.alert("입력 확인", "제목과 자유 서술 내용을 입력해주세요.");
      return;
    }
    // 1. 후기 저장 + 사건에 작성 완료 플래그 설정
    setHasWrittenReview(resolvedCase.id, true);
    addReview({
      authorNickname: nickname,
      authorBadges: registerAsMentor ? ["🛡 인증멘토"] : [],
      industry: autoIndustry,
      region: autoRegion,
      damageType: autoDamageType,
      unpaidAmountRange: getAmountRange(resolvedCase.calculatedUnpaid ?? 0),
      resolveDays: autoResolveDays,
      rating,
      title: trimmedTitle,
      content: trimmedContent,
      tips: {
        complaint: tipComplaint.trim(),
        investigation: tipInvestigation.trim(),
        negotiation: tipNegotiation.trim(),
      },
      isMentor: registerAsMentor,
      mentorUserId: registerAsMentor ? userId : null,
    });

    // 2. 멘토 등록 체크 시 MentorProfile 신규 생성 (이미 있으면 skip)
    if (registerAsMentor) {
      const mentorStore = useMentorStore.getState();
      const existing = mentorStore.getMentorById(userId);
      if (existing === undefined) {
        const myGroup = useGroupStore
          .getState()
          .groups.find((g) => g.leaderId === userId);
        const baseProfile: Omit<MentorProfile, "score"> = {
          userId,
          nickname,
          isVerified: false,
          wasGroupLeader: myGroup !== undefined,
          averageRating: rating,
          reviewCount: 1,
          resolvedDays: autoResolveDays,
          industry: autoIndustry,
          damageTypes: resolvedCase.damageTypes,
          consultingFee: 10000,
          badges: myGroup !== undefined ? ["공동대응대표"] : [],
          bio: trimmedTitle,
        };
        const newProfile: MentorProfile = {
          ...baseProfile,
          score: calcMentorScore(baseProfile),
        };
        mentorStore.addMentor(newProfile);
      }
    }

    // 3. 완료 안내
    Alert.alert(
      "등록 완료",
      registerAsMentor
        ? "후기가 등록되었습니다. 멘토 등록도 함께 완료되었어요!"
        : "후기가 등록되었습니다. 감사해요!",
      [{ text: "확인", onPress: onBack }],
    );
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
          후기 쓰기
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 0,
          paddingBottom: 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 자동 입력 카드 */}
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
            자동 입력
          </Text>
          {[
            { label: "닉네임", value: nickname },
            { label: "업종", value: autoIndustry },
            { label: "지역", value: autoRegion },
            { label: "피해 유형", value: autoDamageType },
            { label: "해결 기간", value: `${autoResolveDays}일` },
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
                style={{
                  fontSize: 13,
                  color: "#0F172A",
                  fontWeight: "500",
                }}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* 별점 */}
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
            해결 만족도
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setRating(n)}
                hitSlop={4}
              >
                <Ionicons
                  name={n <= rating ? "star" : "star-outline"}
                  size={32}
                  color={n <= rating ? "#F59E0B" : "#CBD5E1"}
                />
              </Pressable>
            ))}
            <View style={{ flex: 1 }} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#F59E0B",
                alignSelf: "center",
              }}
            >
              {rating.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* 제목 */}
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
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#475569" }}
            >
              제목
            </Text>
            <Text style={{ fontSize: 11, color: "#94A3B8" }}>
              {`${title.length} / ${MAX_TITLE}`}
            </Text>
          </View>
          <TextInput
            value={title}
            onChangeText={(v) => setTitle(v.slice(0, MAX_TITLE))}
            placeholder="예: 2주만에 해결했어요"
            placeholderTextColor="#94A3B8"
            style={{
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: "#0F172A",
            }}
          />
        </View>

        {/* 노하우 구조화 입력 */}
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
              marginBottom: 4,
            }}
          >
            노하우 (선택)
          </Text>
          <Text
            style={{ fontSize: 11, color: "#94A3B8", marginBottom: 12 }}
          >
            다른 분들께 도움이 되는 팁을 단계별로 적어주세요
          </Text>

          {[
            {
              label: "진정서 작성 팁",
              value: tipComplaint,
              setter: setTipComplaint,
              ph: "예: 날짜와 금액을 정확히 적었어요",
            },
            {
              label: "출석조사 팁",
              value: tipInvestigation,
              setter: setTipInvestigation,
              ph: "예: 통장 내역을 가져가니 좋았어요",
            },
            {
              label: "사업주 협상 팁",
              value: tipNegotiation,
              setter: setTipNegotiation,
              ph: "예: 형사 고소 가능성을 언급했어요",
            },
          ].map((field) => (
            <View key={field.label} style={{ marginBottom: 10 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#1B64DA",
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                {field.label}
              </Text>
              <TextInput
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.ph}
                placeholderTextColor="#94A3B8"
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  color: "#0F172A",
                  minHeight: 48,
                  textAlignVertical: "top",
                }}
              />
            </View>
          ))}
        </View>

        {/* 자유 서술 */}
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
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#475569" }}
            >
              자유 서술
            </Text>
            <Text style={{ fontSize: 11, color: "#94A3B8" }}>
              {`${content.length} / ${MAX_CONTENT}`}
            </Text>
          </View>
          <TextInput
            value={content}
            onChangeText={(v) => setContent(v.slice(0, MAX_CONTENT))}
            placeholder="다른 분들이 참고할 수 있도록 경험을 자유롭게 적어주세요"
            placeholderTextColor="#94A3B8"
            multiline
            style={{
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 13,
              color: "#0F172A",
              minHeight: 120,
              textAlignVertical: "top",
            }}
          />
        </View>

        {/* 멘토 등록 옵션 */}
        <Pressable
          onPress={() => setRegisterAsMentor(!registerAsMentor)}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: registerAsMentor ? "#3182F6" : "#CBD5E1",
              backgroundColor: registerAsMentor ? "#3182F6" : "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 1,
            }}
          >
            {registerAsMentor ? (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#0F172A",
              }}
            >
              멘토로 등록하고 상담 요청 받기
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#64748B",
                lineHeight: 16,
                marginTop: 4,
              }}
            >
              같은 경험을 가진 분들이 ₩10,000 결제 후 상담을 요청할 수 있어요.
              {"\n"}
              증빙서류 업로드 시 인증멘토 배지가 부여됩니다.
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* 하단 고정 제출 버튼 */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
        }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            backgroundColor: canSubmit ? "#3182F6" : "#94A3B8",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            opacity: canSubmit ? 1 : 0.6,
          }}
        >
          <Text
            style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
          >
            후기 등록하기
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

