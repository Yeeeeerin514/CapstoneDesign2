import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenHeader } from "@/shared/ui";
import { useMentorMatchStore } from "@/features/mentor-match";
import { useReportStore } from "@/features/report-submit";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { MentorRegisterView } from "./MentorRegisterView";
import { EvidenceUploadView } from "./EvidenceUploadView";
import { MyApplicantFormView } from "./MyApplicantFormView";
import { ReviewWriteView } from "@/views/report/ui/ReviewWriteView";
import { MatchingFeedbackModal } from "@/views/report/ui/MatchingFeedbackModal";
import type { VerificationMethod } from "@/entities/mentor";

/**
 * MY 탭 — 현재는 "내 멘토링" 섹션만. 추후 프로필/설정 카드 추가 예정.
 * 멘토링 카드 탭하면 어디서든 채팅방으로 진입 가능 (top-level 라우트).
 */
export function MyView(): JSX.Element {
  const userId = useAuthStore((s) => s.userIdString);
  const nickname = useAuthStore((s) => s.nickname);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const myMatches = useMentorMatchStore((s) => s.getMatchesByMentee(userId));
  const cases = useReportStore((s) => s.cases);

  function handleLogout(): void {
    const confirmFn = (): boolean => {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const w = window as { confirm?: (m: string) => boolean };
        return w.confirm ? w.confirm("로그아웃하시겠어요?") : true;
      }
      return false; // 네이티브는 Alert로 처리
    };
    if (Platform.OS === "web") {
      if (confirmFn()) {
        clearAuth();
        router.replace("/login");
      }
    } else {
      Alert.alert("로그아웃", "정말 로그아웃하시겠어요?", [
        { text: "취소", style: "cancel" },
        {
          text: "로그아웃",
          style: "destructive",
          onPress: () => {
            clearAuth();
            router.replace("/login");
          },
        },
      ]);
    }
  }
  const [showMentorRegister, setShowMentorRegister] = useState(false);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [showApplicantForm, setShowApplicantForm] = useState(false);
  const [showFreeReviewWrite, setShowFreeReviewWrite] = useState(false);
  const [mentorVerification, setMentorVerification] = useState<{
    method: VerificationMethod;
    verifiedCaseIds?: number[];
  } | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<{ matchId: string; backendMatchId: number; mentorNickname: string } | null>(null);
  const markFeedbackSubmitted = useMentorMatchStore((s) => s.markFeedbackSubmitted);

  // 멘토 자격 검증 — 해결된 신고 사건이 1개 이상 있어야 자동 통과
  const resolvedCases = cases.filter((c) => c.status === "RESOLVED");
  const hasResolvedCases = resolvedCases.length > 0;

  function handleMentorRegisterClick(): void {
    if (hasResolvedCases) {
      // 자격 통과 — 해결된 사건 ID들 자동 첨부
      const caseIds = resolvedCases
        .map((c) => Number(c.id))
        .filter((n) => !Number.isNaN(n));
      setMentorVerification({
        method: "RESOLVED_CASE",
        verifiedCaseIds: caseIds.length > 0 ? caseIds : [0],
      });
      setShowMentorRegister(true);
      return;
    }

    // 자격 미충족 — 증빙 업로드 옵션 안내
    const message =
      "멘토는 다음 중 하나를 충족해야 합니다:\n\n" +
      "1) 우리 앱에서 신고한 사건 해결 경험\n" +
      "2) 외부 증빙 자료 업로드 (시정지시서·입금증)\n\n" +
      "증빙 자료를 업로드해서 자격을 얻으시겠어요?";

    if (typeof window !== "undefined" && (window as { confirm?: (m: string) => boolean }).confirm) {
      // 웹: confirm으로 결정
      const ok = (window as { confirm: (m: string) => boolean }).confirm(`멘토 등록 자격이 필요해요\n\n${message}`);
      if (ok) setShowEvidenceUpload(true);
    } else {
      Alert.alert(
        "멘토 등록 자격이 필요해요",
        message,
        [
          { text: "취소", style: "cancel" },
          { text: "증빙 자료 올리기", onPress: () => setShowEvidenceUpload(true) },
        ],
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

  if (showEvidenceUpload) {
    return <EvidenceUploadView onBack={() => setShowEvidenceUpload(false)} />;
  }

  if (showApplicantForm) {
    return (
      <MyApplicantFormView onBack={() => setShowApplicantForm(false)} />
    );
  }

  if (showFreeReviewWrite) {
    return <ReviewWriteView onBack={() => setShowFreeReviewWrite(false)} />;
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

        {/* 진정인(본인) 정보 — 로컬 저장 */}
        <Pressable
          onPress={() => setShowApplicantForm(true)}
          style={{
            marginTop: 12,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderWidth: 0.5,
            borderColor: "#E2E8F0",
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#EBF3FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="person-outline" size={18} color="#1A5FAF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0F172A" }}>
              진정인 정보 (본인)
            </Text>
            <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
              진정서 PDF에 자동으로 채워질 본인 정보 · 이 기기에만 저장
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </Pressable>

        {/* 내 해결 경험 공유하기 — 사건 무관 자유 작성 진입 */}
        <Pressable
          onPress={() => setShowFreeReviewWrite(true)}
          style={{
            marginTop: 10,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderWidth: 0.5,
            borderColor: "#E2E8F0",
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#EBF3FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="pencil" size={18} color="#1A5FAF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 14, fontWeight: "600", color: "#0F172A" }}
            >
              내 해결 경험 공유하기
            </Text>
            <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
              임금체불을 해결한 경험이 있다면 다른 분들에게 도움이 돼요
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
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
                  {m.backendMatchId !== undefined && m.feedbackSubmitted !== true ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setFeedbackTarget({
                          matchId: m.id,
                          backendMatchId: m.backendMatchId!,
                          mentorNickname: m.mentorNickname,
                        });
                      }}
                      style={{
                        backgroundColor: "#FEF3C7",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "#92400E", fontWeight: "700" }}>
                        ★ 평가
                      </Text>
                    </Pressable>
                  ) : m.feedbackSubmitted === true ? (
                    <View
                      style={{
                        backgroundColor: "#DCFCE7",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "#16A34A", fontWeight: "700" }}>
                        ✓ 평가완료
                      </Text>
                    </View>
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#CBD5E1"
                    />
                  )}
                </View>
              </Pressable>
            );
          })
        )}

        {/* 매칭 피드백 모달 */}
        {feedbackTarget !== null && (
          <MatchingFeedbackModal
            visible
            matchId={feedbackTarget.backendMatchId}
            mentorNickname={feedbackTarget.mentorNickname}
            onClose={() => setFeedbackTarget(null)}
            onSubmitted={() => {
              markFeedbackSubmitted(feedbackTarget.matchId);
              setFeedbackTarget(null);
            }}
          />
        )}

        {/* 로그아웃 */}
        <Pressable
          onPress={handleLogout}
          style={{
            marginTop: 32,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderWidth: 0.5,
            borderColor: "#FECACA",
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#DC2626" }}>
            로그아웃
          </Text>
        </Pressable>

        <Text
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#94A3B8",
            marginTop: 12,
          }}
        >
          알바지킴이 v0.1
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
