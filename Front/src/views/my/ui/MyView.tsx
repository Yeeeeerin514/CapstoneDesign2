import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenHeader } from "@/shared/ui";
import { useMentorMatchStore } from "@/features/mentor-match";
import { useReportStore } from "@/features/report-submit";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { MentorRegisterView } from "./MentorRegisterView";

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

  if (showMentorRegister) {
    return <MentorRegisterView onBack={() => setShowMentorRegister(false)} />;
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

        {/* 멘토 등록 진입점 */}
        <Pressable
          onPress={() => setShowMentorRegister(true)}
          style={{
            marginTop: 20,
            backgroundColor: "#1D4ED8",
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
            <Ionicons name="ribbon-outline" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
              경험을 나눌 멘토로 등록하기
            </Text>
            <Text style={{ fontSize: 11, color: "#DBEAFE", marginTop: 2, lineHeight: 16 }}>
              내가 겪은 피해를 해결한 경험을 다른 알바생에게 도움 주세요.{"\n"}
              AI 매칭 시스템에 자동 등록됩니다.
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
