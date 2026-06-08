import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import {
  useReviewStore,
  fetchReviewComments,
  createReviewComment,
} from "@/entities/review";

interface ReviewDetailViewProps {
  reviewId: string;
  onBack: () => void;
}

export function ReviewDetailView({
  reviewId,
  onBack,
}: ReviewDetailViewProps): JSX.Element | null {
  const review = useReviewStore((s) => s.getById(reviewId));
  const markHelpful = useReviewStore((s) => s.markHelpful);

  if (review === undefined) {
    return null;
  }

  const handleHelpful = (): void => {
    markHelpful(review.id);
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

        {/* Q&A 댓글 섹션 — 후기 작성자에게 질문하고 답변 받기 (커뮤니티) */}
        <QnaCommentSection reviewId={review.id} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────
// Q&A 댓글 — UI 스켈레톤. 백엔드 연동 전까지는 로컬 state만 유지.
// 작성자(작성자 본인)와 다른 사용자가 댓글을 주고받는 커뮤니티 영역.
// ──────────────────────────────────────

interface QnaComment {
  id: string;
  authorNickname: string;
  isAuthor: boolean;
  body: string;
  createdAt: string;
}

function QnaCommentSection({ reviewId }: { reviewId: string }): JSX.Element {
  const [comments, setComments] = useState<QnaComment[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      const data = await fetchReviewComments(reviewId);
      setComments(data);
    } catch {
      /* 실패 시 빈 목록 유지 */
    }
  }, [reviewId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (): Promise<void> => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      Alert.alert("안내", "내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createReviewComment(reviewId, trimmed);
      setComments((prev) => [...prev, created]);
      setDraft("");
    } catch (err) {
      Alert.alert(
        "전송 실패",
        err instanceof Error ? err.message : "잠시 후 다시 시도해주세요",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ marginTop: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        <Ionicons name="chatbubbles" size={16} color="#0F172A" />
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
          {`Q&A · ${comments.length}건`}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: "#64748B",
          marginBottom: 12,
          lineHeight: 17,
        }}
      >
        작성자에게 궁금한 점을 물어보세요. 답변은 작성자가 직접 달아드려요.
      </Text>

      {comments.length === 0 ? (
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            borderWidth: 0.5,
            borderColor: "#E2E8F0",
          }}
        >
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            첫 질문을 남겨보세요
          </Text>
        </View>
      ) : (
        comments.map((c) => (
          <View
            key={c.id}
            style={{
              backgroundColor: c.isAuthor ? "#EBF3FF" : "#FFFFFF",
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
              borderWidth: 0.5,
              borderColor: c.isAuthor ? "#B5D4F4" : "#E2E8F0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: c.isAuthor ? "#185FA5" : "#0F172A",
                }}
              >
                {c.authorNickname}
              </Text>
              {c.isAuthor ? (
                <View
                  style={{
                    backgroundColor: "#3182F6",
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      color: "#FFFFFF",
                      fontWeight: "700",
                    }}
                  >
                    작성자
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{
                fontSize: 13,
                color: "#0F172A",
                lineHeight: 19,
              }}
            >
              {c.body}
            </Text>
          </View>
        ))
      )}

      {/* 댓글 입력 — 백엔드 연동 전 스켈레톤 */}
      <View
        style={{
          marginTop: 8,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="질문이나 의견을 남겨주세요"
          placeholderTextColor="#94A3B8"
          multiline
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 13,
            color: "#0F172A",
            minHeight: 44,
            maxHeight: 120,
          }}
        />
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={submitting}
          style={{
            backgroundColor: submitting ? "#94A3B8" : "#3182F6",
            paddingHorizontal: 14,
            height: 44,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
            등록
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
