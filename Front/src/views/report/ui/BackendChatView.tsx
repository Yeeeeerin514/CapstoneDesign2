import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchChatMessages,
  sendChatMessage,
  type BackendChatMessage,
} from "@/entities/mentor";
import { useAuthStore } from "@/entities/user/model/auth-store";

interface BackendChatViewProps {
  /** 백엔드 mentorship_match.id — 채팅 영속 키. */
  backendMatchId: number;
  /** 헤더 제목 — 상대방 표시명 (예: "익명 멘티", "○○ 멘토"). */
  title: string;
  /** 헤더 보조 설명 — 상담 맥락 (예: "요식업 · 임금체불"). */
  subtitle?: string;
  onBack: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * 백엔드 1:1 채팅 — 로컬 store 없이 backendMatchId만으로 동작한다.
 * 멘토 인박스(본인이 멘토인 매칭)의 채팅 진입점. 멘티 측 MentorChatView와 달리
 * 발신자 역할을 하드코딩하지 않고 senderUserId === 내 userId 로 "나" 여부를 판정한다.
 *
 * 폴링(4초) + 전송 즉시 반영. 양쪽(멘티·멘토)이 같은 backendMatchId에 메시지를
 * 쓰면 서로의 폴링으로 수신 → 실시간 대화.
 */
export function BackendChatView({
  backendMatchId,
  title,
  subtitle,
  onBack,
}: BackendChatViewProps): JSX.Element {
  const myUserId = useAuthStore((s) => s.userIdString);

  const [messages, setMessages] = useState<BackendChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView | null>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const sinceRef = useRef<string | undefined>(undefined);

  // 백엔드 폴링 — 즉시 1회 + 4초마다 증분 가져오기
  useEffect(() => {
    let cancelled = false;

    async function tick(): Promise<void> {
      try {
        const msgs = await fetchChatMessages(backendMatchId, sinceRef.current);
        if (cancelled) return;
        const fresh = msgs.filter((m) => !seenIdsRef.current.has(m.id));
        if (fresh.length > 0) {
          fresh.forEach((m) => seenIdsRef.current.add(m.id));
          setMessages((prev) => [...prev, ...fresh]);
          sinceRef.current = msgs[msgs.length - 1].createdAt;
        }
      } catch {
        // 네트워크 오류는 조용히 — 다음 폴링에서 재시도
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void tick();
    const interval = setInterval(() => {
      void tick();
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [backendMatchId]);

  const handleSend = async (): Promise<void> => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    setDraft("");
    try {
      const saved = await sendChatMessage(backendMatchId, trimmed);
      if (!seenIdsRef.current.has(saved.id)) {
        seenIdsRef.current.add(saved.id);
        setMessages((prev) => [...prev, saved]);
        sinceRef.current = saved.createdAt;
      }
    } catch {
      // 전송 실패 시 화면 끊김 방지용 임시 메시지 (음수 id — 폴링 중복 회피)
      setMessages((prev) => [
        ...prev,
        {
          id: -Date.now(),
          matchId: backendMatchId,
          senderUserId: myUserId.length > 0 ? Number(myUserId) : null,
          senderRole: "MENTOR",
          text: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      {/* 헤더 */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#E8F2FF",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#185FA5" }}>
            {title.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
            {title}
          </Text>
          <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
            {subtitle !== undefined && subtitle.length > 0
              ? subtitle
              : "익명 1:1 대화 · 실명 비공개"}
          </Text>
        </View>
      </View>

      {/* 면책 배너 */}
      <View
        style={{
          backgroundColor: "#FEF3C7",
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 6,
        }}
      >
        <Ionicons
          name="information-circle"
          size={14}
          color="#B45309"
          style={{ marginTop: 1 }}
        />
        <Text style={{ flex: 1, fontSize: 11, color: "#92400E", lineHeight: 16 }}>
          이 대화는 동료 근로자와의 경험 공유입니다. 법률 자문이 아니며, 최종
          판단은 공인노무사·변호사에게 받으세요.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {loading ? (
            <View style={{ paddingTop: 40, alignItems: "center" }}>
              <ActivityIndicator color="#3182F6" />
            </View>
          ) : messages.length === 0 ? (
            <View style={{ paddingTop: 48, alignItems: "center", paddingHorizontal: 32 }}>
              <Ionicons name="chatbubbles-outline" size={32} color="#CBD5E1" />
              <Text
                style={{
                  fontSize: 13,
                  color: "#64748B",
                  marginTop: 10,
                  textAlign: "center",
                  lineHeight: 19,
                }}
              >
                아직 메시지가 없어요.{"\n"}먼저 인사를 건네보세요.
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              if (msg.senderRole === "SYSTEM" || msg.senderUserId === null) {
                return (
                  <View
                    key={msg.id}
                    style={{ alignItems: "center", marginVertical: 10 }}
                  >
                    <View
                      style={{
                        backgroundColor: "#E2E8F0",
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 10,
                        maxWidth: "90%",
                      }}
                    >
                      <Text
                        style={{ fontSize: 11, color: "#64748B", textAlign: "center" }}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                );
              }
              const isMe = String(msg.senderUserId) === myUserId;
              const senderLabel = isMe ? "나" : title;
              return (
                <View
                  key={msg.id}
                  style={{
                    alignItems: isMe ? "flex-end" : "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#94A3B8",
                      marginBottom: 4,
                      paddingHorizontal: 4,
                    }}
                  >
                    {senderLabel}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      gap: 6,
                      maxWidth: "82%",
                    }}
                  >
                    {isMe ? (
                      <Text style={{ fontSize: 10, color: "#94A3B8" }}>
                        {formatTime(msg.createdAt)}
                      </Text>
                    ) : null}
                    <View
                      style={{
                        backgroundColor: isMe ? "#3182F6" : "#FFFFFF",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 14,
                        borderTopLeftRadius: isMe ? 14 : 4,
                        borderTopRightRadius: isMe ? 4 : 14,
                        borderWidth: isMe ? 0 : 1,
                        borderColor: "#E2E8F0",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: isMe ? "#FFFFFF" : "#0F172A",
                          lineHeight: 20,
                        }}
                      >
                        {msg.text}
                      </Text>
                    </View>
                    {!isMe ? (
                      <Text style={{ fontSize: 10, color: "#94A3B8" }}>
                        {formatTime(msg.createdAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* 입력 영역 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E2E8F0",
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#F1F5F9",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
              maxHeight: 100,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="메시지를 입력하세요"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={300}
              style={{ fontSize: 14, color: "#0F172A", maxHeight: 80, padding: 0 }}
            />
          </View>
          <Pressable
            onPress={() => void handleSend()}
            disabled={draft.trim().length === 0}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: draft.trim().length === 0 ? "#CBD5E1" : "#3182F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
