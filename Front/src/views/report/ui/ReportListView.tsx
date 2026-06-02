import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import {
  STEP_ORDER,
  STEP_META,
  type ReportCase,
  type ReportStatus,
} from "@/entities/report";
import { ReviewListView } from "./ReviewListView";
import { ReviewDetailView } from "./ReviewDetailView";
import { ReviewWriteView } from "./ReviewWriteView";
import { ResolveReviewCard } from "./ResolveReviewCard";
import { useReviewStore } from "@/entities/review";

interface ReportListViewProps {
  cases: ReportCase[];
  onCasePress: (caseId: string) => void;
  /** "+ 새 사건 신고하기" — 같은 신고 탭 내 인라인 업장 선택으로 전환. */
  onNewReport: () => void;
}

const STATUS_BADGE: Record<
  ReportStatus,
  { label: string; bg: string; color: string }
> = {
  PENDING: { label: "접수 대기", bg: "#F1F5F9", color: "#475569" },
  INSPECTING: { label: "조사 중", bg: "#E8F2FF", color: "#1B64DA" },
  CORRECTION_ORDERED: {
    label: "시정 명령",
    bg: "#FEF3C7",
    color: "#92400E",
  },
  RESOLVED: { label: "해결 완료", bg: "#DCFCE7", color: "#15803D" },
  UNRESOLVED: { label: "미해결", bg: "#FEE2E2", color: "#991B1B" },
};

type ReviewFilter = "all" | "same-industry" | "same-region";

const FILTER_CHIPS: Array<{ key: ReviewFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "same-industry", label: "같은 업종" },
  { key: "same-region", label: "같은 지역" },
];

export function ReportListView({
  cases,
  onCasePress,
  onNewReport,
}: ReportListViewProps): JSX.Element {
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>("all");
  const [showReviewList, setShowReviewList] = useState(false);
  /** 특정 사건 후기 작성 진입 — null이 아니면 ReviewWriteView 오버레이. */
  const [reviewWriteCaseId, setReviewWriteCaseId] = useState<string | null>(
    null,
  );
  const [viewingReviewId, setViewingReviewId] = useState<string | null>(null);
  const [showClosedCases, setShowClosedCases] = useState(false);
  /** 자유 작성 모드 — 사건 없이 해결 경험 공유. */
  const [showFreeReviewWrite, setShowFreeReviewWrite] = useState(false);
  /** 실제 후기 데이터 — HomeView/ReportEmptyView와 동일한 소스 (useReviewStore). */
  const reviews = useReviewStore((s) => s.reviews);
  const hasResolvedCase = cases.some(
    (c) => c.status === "RESOLVED" && c.hasWrittenReview !== true,
  );
  const firstResolvedNotReviewed = cases.find(
    (c) => c.status === "RESOLVED" && c.hasWrittenReview !== true,
  );

  // 진행 중 vs 종료(해결됨/미수령) 분리
  const activeCases = cases.filter(
    (c) => c.status !== "RESOLVED" && c.status !== "UNRESOLVED",
  );
  const closedCases = cases.filter(
    (c) => c.status === "RESOLVED" || c.status === "UNRESOLVED",
  );

  if (showReviewList) {
    return <ReviewListView onBack={() => setShowReviewList(false)} />;
  }
  if (viewingReviewId !== null) {
    return (
      <ReviewDetailView
        reviewId={viewingReviewId}
        onBack={() => setViewingReviewId(null)}
      />
    );
  }
  if (reviewWriteCaseId !== null) {
    const targetCase = cases.find((c) => c.id === reviewWriteCaseId);
    return (
      <ReviewWriteView
        resolvedCase={targetCase}
        onBack={() => setReviewWriteCaseId(null)}
      />
    );
  }
  if (showFreeReviewWrite) {
    // resolvedCase 없이 진입 → ReviewWriteView 자유 작성 모드
    return <ReviewWriteView onBack={() => setShowFreeReviewWrite(false)} />;
  }

  // PoC 단계: ReportCase에 industry/region 필드가 없으므로 현재 사용자 컨텍스트 mock.
  // 실제 구현 시 cases[0].industry / cases[0].region 으로 교체.
  const currentContext =
    cases[0] !== undefined
      ? { industry: "카페·음식점", region: "서울" }
      : undefined;

  const filteredReviews = (() => {
    if (activeFilter === "all") return reviews;
    if (activeFilter === "same-industry") {
      return reviews.filter(
        (r) => r.industry === currentContext?.industry,
      );
    }
    return reviews.filter((r) => r.region === currentContext?.region);
  })();

  const handleNewReport = onNewReport;

  const handleMoreReviews = (): void => {
    setShowReviewList(true);
  };


  const handleReadReview = (reviewId: string): void => {
    setViewingReviewId(reviewId);
  };

  const handleWriteReview = (): void => {
    if (firstResolvedNotReviewed !== undefined) {
      setReviewWriteCaseId(firstResolvedNotReviewed.id);
    }
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      <ScreenHeader showLogo />

      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#0F172A" }}>
          신고
        </Text>
        <Text style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
          {`진행 중인 사건 ${activeCases.length}건 · 해결된 사건 ${closedCases.length}건`}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
      >
        {/* ───── 섹션 1: 진행 중인 내 사건 ───── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
            진행 중인 사건
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>
            {`${activeCases.length}건`}
          </Text>
        </View>

        {activeCases.length === 0 ? (
          <View
            style={{
              backgroundColor: "#F1F5F9",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 13, color: "#64748B" }}>
              진행 중인 사건이 없습니다
            </Text>
          </View>
        ) : (
          activeCases.map((c) => (
            <CaseCard
              key={c.id}
              reportCase={c}
              onPress={() => onCasePress(c.id)}
            />
          ))
        )}

        {/* + 새 사건 신고하기 CTA */}
        <Pressable
          onPress={handleNewReport}
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1.5,
            borderColor: "#3182F6",
            borderRadius: 12,
            paddingVertical: 13,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 4,
          }}
        >
          <Ionicons name="add" size={18} color="#3182F6" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#3182F6" }}>
            새 사건 신고하기
          </Text>
        </Pressable>

        {/* ───── 섹션 1.5: 해결된 사건 (접힘) ───── */}
        {closedCases.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Pressable
              onPress={() => setShowClosedCases((v) => !v)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 8,
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
              >
                {`해결된 사건 ${closedCases.length}건`}
              </Text>
              <Ionicons
                name={showClosedCases ? "chevron-up" : "chevron-down"}
                size={16}
                color="#64748B"
              />
            </Pressable>
            {showClosedCases
              ? closedCases.map((c) => (
                  <CaseCard
                    key={c.id}
                    reportCase={c}
                    dimmed
                    onPress={() => onCasePress(c.id)}
                    onWriteReview={
                      c.status === "RESOLVED" && c.hasWrittenReview !== true
                        ? () => setReviewWriteCaseId(c.id)
                        : undefined
                    }
                  />
                ))
              : null}
          </View>
        ) : null}

        {/* ───── 섹션 2: 해결 후기 둘러보기 ───── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 28,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
            해결 후기
          </Text>
          <Pressable
            onPress={handleMoreReviews}
            hitSlop={6}
            style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
          >
            <Text style={{ fontSize: 12, color: "#64748B" }}>더 보기</Text>
            <Ionicons name="chevron-forward" size={12} color="#64748B" />
          </Pressable>
        </View>

        {/* 필터 칩 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
          style={{ marginBottom: 12 }}
        >
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeFilter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setActiveFilter(chip.key)}
                style={{
                  backgroundColor: isActive ? "#3182F6" : "#F1F5F9",
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: isActive ? "#FFFFFF" : "#475569",
                  }}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 후기 카드들 (필터 적용, 최대 2개) */}
        {filteredReviews.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 20,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text
              style={{ fontSize: 12, color: "#94A3B8", textAlign: "center" }}
            >
              {activeFilter === "same-industry"
                ? "같은 업종 후기가 아직 없어요"
                : "같은 지역 후기가 아직 없어요"}
            </Text>
          </View>
        ) : (
          filteredReviews.slice(0, 2).map((review) => (
            <ResolveReviewCard
              key={review.id}
              review={review}
              onPressDetail={() => handleReadReview(review.id)}
            />
          ))
        )}

        {/* "+ 내 해결 경험 공유하기" — 사건 무관 자유 작성 진입점 */}
        <Pressable
          onPress={() => setShowFreeReviewWrite(true)}
          style={{
            marginTop: 12,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#3182F6",
            borderStyle: "dashed",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Ionicons name="pencil" size={14} color="#3182F6" />
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#3182F6" }}>
            + 내 해결 경험 공유하기
          </Text>
        </Pressable>

        {/* ───── 섹션 3: 내 후기 쓰기 (해결된 사건이 있을 때만) ───── */}
        {hasResolvedCase ? (
          <View
            style={{
              backgroundColor: "#DCFCE7",
              borderRadius: 14,
              padding: 16,
              marginTop: 20,
              borderWidth: 1,
              borderColor: "#BBF7D0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Ionicons name="trophy" size={18} color="#15803D" />
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#14532D" }}
              >
                해결된 사건이 있네요!
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "#166534",
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              경험을 나눠 다른 분들을 도와주세요. 멘토로 활동할 수도 있습니다.
            </Text>
            <Pressable
              onPress={handleWriteReview}
              style={{
                backgroundColor: "#16A34A",
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                후기 쓰기
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

interface CaseCardProps {
  reportCase: ReportCase;
  onPress: () => void;
  /** 해결됨/미수령 사건은 흐리게 + 금액 대신 종결 정보 표시. */
  dimmed?: boolean;
  /** 후기 미작성 해결 사건일 때만 정의됨 — 카드 안에 "후기 쓰기" 링크 노출. */
  onWriteReview?: () => void;
}

function CaseCard({
  reportCase: c,
  onPress,
  dimmed = false,
  onWriteReview,
}: CaseCardProps): JSX.Element {
  const badge = STATUS_BADGE[c.status];
  const stepIdx = STEP_ORDER.indexOf(c.currentStep);
  const progressPercent = Math.round(
    ((stepIdx + 1) / STEP_ORDER.length) * 100,
  );
  const progressWidth: `${number}%` = `${progressPercent}%`;
  const currentStepLabel = STEP_META[c.currentStep].label;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        opacity: dimmed ? 0.7 : 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: dimmed ? "#64748B" : "#0F172A",
            }}
          >
            {c.workplaceName}
          </Text>
          <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
            {`신고 시작 ${c.createdAt.slice(0, 10)}`}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: badge.bg,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
          }}
        >
          <Text
            style={{ color: badge.color, fontSize: 11, fontWeight: "600" }}
          >
            {badge.label}
          </Text>
        </View>
      </View>

      {dimmed ? (
        // 종결된 사건은 금액 대신 종결 정보 + 후기 작성 링크(미작성 시) 표시
        <>
          <View
            style={{
              backgroundColor:
                c.status === "RESOLVED" ? "#EAF3DE" : "#FEECEC",
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: c.status === "RESOLVED" ? "#3B6D11" : "#C0392B",
              }}
            >
              {c.status === "RESOLVED"
                ? `✅ ${c.resolvedAt?.slice(0, 10) ?? ""} 해결`
                : "🔴 미수령 — 민사 진행 필요"}
            </Text>
          </View>
          {onWriteReview !== undefined ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onWriteReview();
              }}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#3B6D11",
                paddingVertical: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: "#3B6D11",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                ✍️ 후기 쓰기
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <View
            style={{
              backgroundColor:
                c.calculatedUnpaid !== null ? "#FEF2F2" : "#F1F5F9",
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: c.calculatedUnpaid !== null ? "#991B1B" : "#64748B",
                marginBottom: 2,
              }}
            >
              {c.calculatedUnpaid !== null
                ? "미지급 임금"
                : "미지급금 계산 대기"}
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: c.calculatedUnpaid !== null ? "#DC2626" : "#94A3B8",
              }}
            >
              {c.calculatedUnpaid !== null
                ? `₩${c.calculatedUnpaid.toLocaleString()}`
                : "증거 수집 중"}
            </Text>
          </View>

          <View style={{ marginBottom: 10 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#3182F6",
                marginBottom: 6,
              }}
            >
              {`${currentStepLabel} · ${progressPercent}%`}
            </Text>
            <View
              style={{
                height: 6,
                backgroundColor: "#F1F5F9",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 6,
                  width: progressWidth,
                  backgroundColor: "#3182F6",
                }}
              />
            </View>
          </View>
        </>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 4,
        }}
      >
        <Text
          style={{ fontSize: 13, color: "#3182F6", fontWeight: "600" }}
        >
          사건 상세 보기
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#3182F6" />
      </View>
    </Pressable>
  );
}
