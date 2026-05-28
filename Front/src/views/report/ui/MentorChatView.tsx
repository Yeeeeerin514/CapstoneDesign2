import { useRef, useState } from "react";
import {
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
import { useMentorMatchStore } from "@/features/mentor-match";
import { useAuthStore } from "@/entities/user/model/auth-store";

interface MentorChatViewProps {
  matchId: string;
  onBack: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * 1:1 멘토 채팅 — useMentorMatchStore.matches[id] 기반.
 * 매칭은 한 번 생성되면 영구 보존되므로, 동일 matchId로 어디서든 재진입 가능.
 *   - 사건 상세 "연결된 멘토" 카드
 *   - MY 탭 "내 멘토링" 목록
 *   - MentorRecommendView 결제 성공 직후 첫 진입
 */
export function MentorChatView({
  matchId,
  onBack,
}: MentorChatViewProps): JSX.Element {
  const match = useMentorMatchStore((s) =>
    s.matches.find((m) => m.id === matchId),
  );
  const addMessage = useMentorMatchStore((s) => s.addMessage);
  const userId = useAuthStore((s) => s.userIdString);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);

  if (match === undefined) {
    return (
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      >
        <View
          style={{
            flexDirection: "row",
            padding: 16,
            gap: 8,
            alignItems: "center",
          }}
        >
          <Pressable onPress={onBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>
            멘토 채팅
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Text style={{ fontSize: 13, color: "#64748B" }}>
            채팅방을 찾을 수 없습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSend = (): void => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    addMessage(matchId, {
      senderId: userId,
      senderRole: "mentee",
      text: trimmed,
      timestamp: new Date().toISOString(),
    });
    setDraft("");
    setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      50,
    );
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      {/* 헤더 — 닉네임 비공개, mentorNickname만 표기 */}
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
          <Text
            style={{ fontSize: 16, fontWeight: "600", color: "#185FA5" }}
          >
            {match.mentorNickname.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}
          >
            {`${match.mentorNickname} 멘토`}
          </Text>
          <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
            익명 1:1 대화 · 닉네임 비공개
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
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            color: "#92400E",
            lineHeight: 16,
          }}
        >
          이 대화는 동료 근로자와의 경험 공유입니다. 법률 자문이 아니며,
          최종 판단은 공인노무사·변호사에게 받으세요.
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
          {match.chatMessages.map((msg) => {
            if (msg.senderRole === "system") {
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
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        textAlign: "center",
                      }}
                    >
                      {msg.text}
                    </Text>
                  </View>
                </View>
              );
            }
            const isMe = msg.senderId === userId;
            const senderLabel = isMe ? "나" : `${match.mentorNickname} 멘토`;
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
                      {formatTime(msg.timestamp)}
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
                      {formatTime(msg.timestamp)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
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
              style={{
                fontSize: 14,
                color: "#0F172A",
                maxHeight: 80,
                padding: 0,
              }}
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={draft.trim().length === 0}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor:
                draft.trim().length === 0 ? "#CBD5E1" : "#3182F6",
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
