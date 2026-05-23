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
import { useGroupStore } from "@/features/co-action";
import { useAuthStore } from "@/entities/user/model/auth-store";

interface GroupChatViewProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
}

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (isToday) return `${hh}:${mm}`;
  if (isYesterday) return `어제 ${hh}:${mm}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${hh}:${mm}`;
}

/**
 * 공동대응 그룹 채팅 — 메시지는 useGroupStore.groups[*].chatMessages에 영구 저장.
 * 사건 상세 본문 / 진행 단계 카드 / "연결된 공동대응 그룹" 카드 / GroupJoinView 어디서 열어도
 * 동일한 group.chatMessages를 보고, 어떤 진입점에서 send해도 모든 진입점에서 동일하게 보임.
 */
export function GroupChatView({
  groupId,
  groupName,
  onBack,
}: GroupChatViewProps): JSX.Element {
  const group = useGroupStore((s) => s.groups.find((g) => g.id === groupId));
  const addGroupChatMessage = useGroupStore((s) => s.addGroupChatMessage);
  const userId = useAuthStore((s) => s.userIdString);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);

  if (group === undefined) {
    return (
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      >
        <View style={{ flexDirection: "row", padding: 16, gap: 8 }}>
          <Pressable onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>
            그룹 채팅
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
            그룹을 찾을 수 없어요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const memberMap = new Map(group.members.map((m) => [m.userId, m]));

  const handleSend = (): void => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    addGroupChatMessage(groupId, {
      senderId: userId,
      text: trimmed,
      timestamp: new Date().toISOString(),
    });
    setDraft("");
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
            backgroundColor: "#DBEAFE",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="people" size={18} color="#1B64DA" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
            {groupName}
          </Text>
          <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
            {`참여자 ${group.members.length}명 · 익명 닉네임`}
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
          이 대화는 같은 피해를 입은 동료들의 정보 공유 채널입니다. 법률
          자문이 아니며, 최종 판단은 공인노무사·변호사에게 받으세요.
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
          {group.chatMessages.map((msg) => {
            if (msg.system === true) {
              return (
                <View
                  key={msg.id}
                  style={{ alignItems: "center", marginVertical: 10 }}
                >
                  <View
                    style={{
                      backgroundColor: "#E2E8F0",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#64748B" }}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              );
            }
            const isMe = msg.senderId === userId;
            const sender = memberMap.get(msg.senderId);
            const senderLabel =
              isMe === true
                ? "나"
                : `${sender?.nickname ?? "익명"}${msg.senderId === group.leaderId ? " 👑" : ""}`;
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
                      {formatChatTime(msg.timestamp)}
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
                      {formatChatTime(msg.timestamp)}
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
