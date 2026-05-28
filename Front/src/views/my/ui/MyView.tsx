import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenHeader } from "@/shared/ui";
import { useMentorMatchStore } from "@/features/mentor-match";
import { useReportStore } from "@/features/report-submit";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { MentorRegisterView } from "./MentorRegisterView";
import type { VerificationMethod } from "@/entities/mentor";

/**
 * MY 탭 — 현재는 "내 멘토링" 섹션만. 추후 프로필/설정 카드 추가 예정.
 * 멘토링 카드 탭하면 어디서든 채팅방으로 진입 가능 (top-level 라우트).
 */
export function MyView(): JSX.Element {
  const userId = useAuthStore((s) => s.userIdString);
  const nickname = useAuthStore((s) => s.nickname);
  const myMatches = useMentorMatchStore((s) => s.getMatchesByMentee(userId));
  const cases = useReportStore((s) => s.cases);
  const [showMentorRegister, setShowMentorRegister] = useState(false);
  const [mentorVerification, setMentorVerification] = useState<{
    method: VerificationMethod;
    verifiedCaseIds?: number[];
  } | null>(null);

  // 멘토 자격 검증 — 해결된 신고 사건이 1개 이상 있어야 자동 통과
  const resolvedCases = cases.filter((c) => c.status === "resolved");
  const hasResolvedCases = resolvedCases.length > 0;

  function handleMentorRegisterClick(): void {
    if (hasResolvedCases) {
      // 자격 통과 — 해결된 사건 ID들 자동 첨부
      // ReportCase.id가 string이므로 number로 시도 (실제 백엔드 연결 시점에 보정)
      const caseIds = resolvedCases
        .map((c) => Number(c.id))
        .filter((n) => !Number.isNaN(n));
      setMentorVerification({
        method: "RESOLVED_CASE",
        verifiedCaseIds: caseIds.length > 0 ? caseIds : [0],
      });
      setShowMentorRegister(true);
    } else {
      // 자격 미충족 안내
      Alert.alert(
        "멘토 등록 자격이 필요해요",
        "멘토는 다음 중 하나를 충족해야 합니다:\n\n" +
        "1) 우리 앱에서 신고한 사건을 해결한 경험\n" +
        "2) 외부 증빙 자료(시정지시서·입금증 등) 업로드\n\n" +
        "현재 해결된 사건이 없어요. 신고를 통해 해결을 끝낸 후 다시 시도해주세요.",
        [{ text: "확인" }],
      );
    }
  }

  if (showMentorRegister) {
    return (
      <MentorRegisterView
        onBack={() => {
          setShowMentorRegister(false);
          setMentorVerification(null);
        }}
        verification={mentorVerification ?? undefined}
      />
    );
  }

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
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#0F172A" }}>
          마이페이지
        </Text>
        <Text style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
          {nickname.length > 0 ? `${nickname}님, 안녕하세요` : "환영합니다"}
        </Text>

        {/* 멘토 등록 진입점 (자격 게이트 포함) */}
        <Pressable
          onPress={handleMentorRegisterClick}
          style={{
            marginTop: 20,
            backgroundColor: hasResolvedCases ? "#1D4ED8" : "#64748B",
            borderRadius: 14,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={hasResolvedCases ? "ribbon" : "lock-closed-outline"}
              size={22}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                경험을 나눌 멘토로 등록하기
              </Text>
              {hasResolvedCases && (
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.25)",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 9, color: "#fff", fontWeight: "700" }}>
                    자격 OK
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 11, color: "#DBEAFE", marginTop: 2, lineHeight: 16 }}>
              {hasResolvedCases
                ? `해결한 사건 ${resolvedCases.length}건이 자격 증빙으로 자동 첨부됩니다`
                : "해결한 신고 사건이 있어야 등록할 수 있어요"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 24,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
            내 멘토링
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>
            {`${myMatches.length}건`}
          </Text>
        </View>

        {myMatches.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 24,
              alignItems: "center",
            }}
          >
            <Ionicons name="school-outline" size={32} color="#94A3B8" />
            <Text
              style={{
                fontSize: 13,
                color: "#64748B",
                marginTop: 10,
                textAlign: "center",
              }}
            >
              아직 연결된 멘토가 없어요
            </Text>
          </View>
        ) : (
          myMatches.map((m) => {
            const linkedCase = cases.find((c) => c.id === m.caseId);
            const preview = m.lastMessagePreview ?? "새 대화";
            const dateLabel =
              m.lastMessageAt !== undefined
                ? new Date(m.lastMessageAt).toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                  })
                : new Date(m.matchedAt).toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                  });
            return (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/mentor-chat/${m.id}`)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 0.5,
                  borderColor: "#E0E0DC",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "#EBF3FF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "600",
                        color: "#185FA5",
                      }}
                    >
                      {m.mentorNickname.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#0F172A",
                      }}
                    >
                      {`${m.mentorNickname} 멘토`}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#94A3B8",
                        marginTop: 2,
                      }}
                    >
                      {linkedCase?.workplaceName ?? "사건"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        color:
                          m.lastMessagePreview !== undefined
                            ? "#64748B"
                            : "#1A5FAF",
                        marginTop: 2,
                        maxWidth: 200,
                      }}
                    >
                      {preview}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 11, color: "#AAAAAA" }}>
                    {dateLabel}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color="#CBD5E1"
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
