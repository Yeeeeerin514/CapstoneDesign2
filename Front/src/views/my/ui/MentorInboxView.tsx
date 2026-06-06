import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { ScreenHeader } from "@/shared/ui";
import { fetchMyMentorMatches, type MentorInboxMatch } from "@/entities/mentor";

interface Props {
  onBack: () => void;
}

function statusMeta(status: string): { label: string; bg: string; fg: string } {
  if (status === "COMPLETED") {
    return { label: "해결됨", bg: "#DCFCE7", fg: "#16A34A" };
  }
  return { label: "진행 중", bg: "#DBEAFE", fg: "#1D4ED8" };
}

function dateLabel(iso: string | null): string {
  if (iso === null) return "";
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

/**
 * 멘토 인박스 — 로그인한 사용자가 "멘토로서" 받은 상담(매칭) 목록.
 * GET /api/mentoring/my-mentor-matches. 카드 탭 → backendMatchId로 채팅 진입.
 * (멘티 측 "내 멘토링"과 대칭되는, 멘토 측 진입점.)
 */
export function MentorInboxView({ onBack }: Props): JSX.Element {
  const [matches, setMatches] = useState<MentorInboxMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const data = await fetchMyMentorMatches();
      setMatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했어요");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 화면 진입/복귀(채팅에서 뒤로) 시마다 갱신 → 마지막 메시지 미리보기 최신화
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function openChat(m: MentorInboxMatch): void {
    const subtitleParts = [
      m.industry ?? "",
      ...(m.damageTypes.length > 0 ? [m.damageTypes.slice(0, 2).join(", ")] : []),
    ].filter((s) => s.length > 0);
    const subtitle = subtitleParts.join(" · ");
    const qs =
      `?title=${encodeURIComponent(m.menteeLabel)}` +
      `&subtitle=${encodeURIComponent(subtitle)}`;
    router.push(`/mentor-inbox/${m.matchId}${qs}`);
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScreenHeader showLogo />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          gap: 8,
        }}
      >
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A" }}>
          멘토로 받은 상담
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 14, lineHeight: 18 }}>
          멘티가 회원님을 멘토로 확정한 상담이에요. 카드를 누르면 1:1 채팅으로
          이어집니다. 실명은 공개되지 않아요.
        </Text>

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color="#3182F6" />
          </View>
        ) : error !== null ? (
          <View
            style={{
              backgroundColor: "#FEF2F2",
              borderRadius: 12,
              padding: 18,
              alignItems: "center",
            }}
          >
            <Ionicons name="alert-circle-outline" size={26} color="#DC2626" />
            <Text style={{ fontSize: 13, color: "#B91C1C", marginTop: 8, textAlign: "center" }}>
              {error}
            </Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                void load();
              }}
              style={{
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#FECACA",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#DC2626" }}>
                다시 시도
              </Text>
            </Pressable>
          </View>
        ) : matches.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 28,
              alignItems: "center",
            }}
          >
            <Ionicons name="briefcase-outline" size={34} color="#94A3B8" />
            <Text
              style={{
                fontSize: 13,
                color: "#64748B",
                marginTop: 12,
                textAlign: "center",
                lineHeight: 19,
              }}
            >
              아직 받은 상담이 없어요.{"\n"}멘토로 등록하면 비슷한 피해를 겪은 멘티와
              매칭됩니다.
            </Text>
          </View>
        ) : (
          matches.map((m) => {
            const meta = statusMeta(m.status);
            const preview = m.lastMessageText ?? "아직 대화가 없어요 · 먼저 인사를 건네보세요";
            const when = dateLabel(m.lastMessageAt ?? m.matchedAt ?? m.createdAt);
            const context = [
              m.industry ?? "",
              ...(m.damageTypes.length > 0 ? [m.damageTypes.slice(0, 2).join(", ")] : []),
            ]
              .filter((s) => s.length > 0)
              .join(" · ");
            return (
              <Pressable
                key={m.matchId}
                onPress={() => openChat(m)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 0.5,
                  borderColor: "#E2E8F0",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
                    <Ionicons name="person" size={20} color="#185FA5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
                        {m.menteeLabel}
                      </Text>
                      <View
                        style={{
                          backgroundColor: meta.bg,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "700", color: meta.fg }}>
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                    {context.length > 0 ? (
                      <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                        {context}
                      </Text>
                    ) : null}
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        color: m.lastMessageText !== null ? "#64748B" : "#1A5FAF",
                        marginTop: 3,
                      }}
                    >
                      {preview}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    {when.length > 0 ? (
                      <Text style={{ fontSize: 11, color: "#AAAAAA" }}>{when}</Text>
                    ) : null}
                    <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
