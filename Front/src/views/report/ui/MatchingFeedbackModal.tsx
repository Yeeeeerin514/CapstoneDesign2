/**
 * 매칭 피드백 수집 모달.
 *
 * 사용자가 멘토와 대화 후 별점/해결 여부/대화 일수를 입력.
 * POST /api/mentoring/feedback → 백엔드가 Thompson Sampling 가중치 자동 학습.
 * 콜드스타트 환경에서 데이터를 모으는 핵심 UX.
 */
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { submitMatchingFeedback } from "@/entities/mentor";

interface Props {
  visible: boolean;
  matchId: number;
  mentorNickname: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function MatchingFeedbackModal({
  visible,
  matchId,
  mentorNickname,
  onClose,
  onSubmitted,
}: Props): JSX.Element {
  const [rating, setRating] = useState<number>(0);
  const [chatDays, setChatDays] = useState<string>("1");
  const [resolved, setResolved] = useState<boolean | null>(null);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (rating === 0) {
      notify("입력 필요", "별점을 선택해주세요.");
      return;
    }
    if (resolved === null) {
      notify("입력 필요", "해결 여부를 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await submitMatchingFeedback({
        matchId,
        rating,
        chatDays: Number(chatDays) || 1,
        resolved,
        comment: comment.trim() || undefined,
      });
      notify(
        "피드백 감사합니다",
        "Thompson Sampling 가중치가 자동으로 업데이트됐어요.\n다음 매칭부터 더 정확해집니다.",
      );
      onSubmitted?.();
      onClose();
    } catch (err) {
      notify(
        "전송 실패",
        err instanceof Error ? err.message : "잠시 후 다시 시도해주세요",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 32,
            maxHeight: "85%",
          }}
        >
          {/* 핸들 */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2 }} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Ionicons name="star" size={20} color="#F59E0B" />
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#0F172A" }}>
              매칭 평가하기
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 18 }}>
            {mentorNickname} 멘토와의 매칭은 어떠셨나요?
          </Text>

          {/* 별점 */}
          <Text style={labelStyle}>1. 멘토 만족도 *</Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)}>
                <Ionicons
                  name={n <= rating ? "star" : "star-outline"}
                  size={32}
                  color={n <= rating ? "#F59E0B" : "#CBD5E1"}
                />
              </Pressable>
            ))}
          </View>

          {/* 해결 여부 */}
          <Text style={labelStyle}>2. 사건이 해결됐나요? *</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <Pressable
              onPress={() => setResolved(true)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: resolved === true ? "#16A34A" : "#F1F5F9",
                borderWidth: 1,
                borderColor: resolved === true ? "#16A34A" : "#E2E8F0",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: resolved === true ? "#fff" : "#475569",
                }}
              >
                ✓ 네, 해결됐어요
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setResolved(false)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: resolved === false ? "#DC2626" : "#F1F5F9",
                borderWidth: 1,
                borderColor: resolved === false ? "#DC2626" : "#E2E8F0",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: resolved === false ? "#fff" : "#475569",
                }}
              >
                ✗ 아직 못 받았어요
              </Text>
            </Pressable>
          </View>

          {/* 대화 일수 */}
          <Text style={labelStyle}>3. 대화 지속 일수</Text>
          <TextInput
            value={chatDays}
            onChangeText={setChatDays}
            keyboardType="number-pad"
            placeholder="예: 7"
            style={inputStyle}
            placeholderTextColor="#94A3B8"
          />

          {/* 코멘트 */}
          <Text style={labelStyle}>4. 한 줄 후기 (선택)</Text>
          <TextInput
            value={comment}
            onChangeText={(v) => setComment(v.slice(0, 200))}
            placeholder="멘토의 어떤 도움이 가장 좋았나요?"
            multiline
            style={[inputStyle, { minHeight: 60, textAlignVertical: "top", marginBottom: 16 }]}
            placeholderTextColor="#94A3B8"
          />

          {/* 안내 */}
          <View
            style={{
              backgroundColor: "#EFF6FF",
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
              flexDirection: "row",
              gap: 6,
            }}
          >
            <Ionicons name="information-circle" size={14} color="#1D4ED8" style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 11, color: "#1D4ED8", lineHeight: 16 }}>
              피드백은 Thompson Sampling 알고리즘에 자동 반영되어, 다음 매칭부터 더 정확해집니다.
            </Text>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: submitting ? "#9CA3AF" : "#3182F6",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                피드백 전송
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function notify(title: string, message: string): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

const labelStyle = {
  fontSize: 12,
  fontWeight: "700" as const,
  color: "#334155",
  marginBottom: 8,
};

const inputStyle = {
  borderWidth: 1,
  borderColor: "#E2E8F0",
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 13,
  color: "#0F172A",
  backgroundColor: "#fff",
  marginBottom: 12,
};
