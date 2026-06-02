import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";
import { useReviewStore } from "@/entities/review";
import { ReviewDetailView } from "./ReviewDetailView";
import { ReviewWriteView } from "./ReviewWriteView";
import { ResolveReviewCard } from "./ResolveReviewCard";

interface ReportEmptyViewProps {
  /** "사업장 검색해서 신고" — 등록되지 않은 사업장도 검색해서 신고. */
  onSearchBusiness: () => void;
  /** "내 등록 업장에서 신고" — 기존 관심업장 흐름 (BSSID 등록 완료 업장만). */
  onSelectRegistered: () => void;
  /**
   * 진입 모드.
   *   - "empty"        : 진행 중 사건 0건 (탭 첫 진입)
   *   - "add-new-case" : 이미 진행 중 사건 있는 상태에서 "+ 새 사건 신고하기" 진입
   * 모드에 따라 헤더/배너/뒤로가기 표시가 달라짐.
   */
  mode?: "empty" | "add-new-case";
  /** add-new-case 모드에서 뒤로가기 시 호출. */
  onBack?: () => void;
}

/**
 * 신고 진입점 — 두 갈래(검색 / 등록 업장)로 분기.
 *   - mode="empty"        : 진행 중 사건 0건일 때 자동 진입
 *   - mode="add-new-case" : 진행 중 사건이 있는 상태에서 새 사건 추가 시
 */
export function ReportEmptyView({
  onSearchBusiness,
  onSelectRegistered,
  mode = "empty",
  onBack,
}: ReportEmptyViewProps): JSX.Element {
  const isAddNewCase = mode === "add-new-case";

  // ─── Hooks: 모든 useState/useStore 호출은 conditional return 보다 위에 있어야 함 ───
  /** 후기 자세히 보기 진입 — Empty 화면 안에서 ReviewDetailView 오버레이 렌더. */
  const [viewingReviewId, setViewingReviewId] = useState<string | null>(null);
  /** 자유 작성 모드 — 사건 없이 해결 경험 공유. */
  const [showFreeReviewWrite, setShowFreeReviewWrite] = useState(false);
  const registeredCount = useFavoriteWorkplaceStore(
    (s) => s.workplaces.filter((w) => w.registrationStatus === "registered").length,
  );
  /** 실제 후기 데이터 — HomeView와 동일한 소스 (useReviewStore). */
  const reviews = useReviewStore((s) => s.reviews);

  // ─── Conditional returns: 반드시 모든 Hook 호출 이후 ───
  if (viewingReviewId !== null) {
    return (
      <ReviewDetailView
        reviewId={viewingReviewId}
        onBack={() => setViewingReviewId(null)}
      />
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

      {/* add-new-case 모드: 뒤로가기 + 컨텍스트 헤더 */}
      {isAddNewCase ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            gap: 8,
          }}
        >
          <Pressable onPress={onBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}
            >
              새 사건 신고
            </Text>
            <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              어떻게 신고할지 골라주세요
            </Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: isAddNewCase ? 0 : 16,
          paddingBottom: 32,
        }}
      >
        {/* empty 모드: 큰 제목 + 부제 + "진행 중 신고 없음" 배너 */}
        {!isAddNewCase ? (
          <>
            <Text
              style={{ fontSize: 22, fontWeight: "700", color: "#0F172A" }}
            >
              신고
            </Text>
            <Text style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              임금체불, 부당해고 등 위법 사항을 신고합니다
            </Text>
            <View
              style={{
                marginTop: 16,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderWidth: 0.5,
                borderColor: "#E2E8F0",
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color="#94A3B8" />
              <Text style={{ fontSize: 13, color: "#64748B" }}>
                진행 중인 신고가 없어요
              </Text>
            </View>
          </>
        ) : null}

        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#0F172A",
            marginTop: isAddNewCase ? 4 : 24,
            marginBottom: 12,
          }}
        >
          어디를 신고할까요?
        </Text>

        {/* CTA 1 — 사업장 검색해서 신고 */}
        <Pressable
          onPress={onSearchBusiness}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            borderWidth: 1,
            borderColor: "#3182F6",
            marginBottom: 10,
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
            <Ionicons name="search" size={22} color="#1A5FAF" />
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}
              >
                사업장 검색해서 신고
              </Text>
              <View
                style={{
                  backgroundColor: "#DCFCE7",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    color: "#15803D",
                    fontWeight: "700",
                  }}
                >
                  등록 없이 가능
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "#64748B",
                marginTop: 4,
                lineHeight: 17,
              }}
            >
              이름·지역으로 찾아 바로 신고해요
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </Pressable>

        {/* CTA 2 — 내 등록 업장에서 신고 */}
        <Pressable
          onPress={onSelectRegistered}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            borderWidth: 0.5,
            borderColor: "#E2E8F0",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#F1F5F9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="business" size={22} color="#475569" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
              내 등록 업장에서 신고
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#64748B",
                marginTop: 4,
                lineHeight: 17,
              }}
            >
              근무기록·계약서가 자동으로 첨부돼요
            </Text>
          </View>
          <Text
            style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600" }}
          >
            {`${registeredCount}곳`}
          </Text>
        </Pressable>

        {/* 신고 절차 안내 */}
        <View
          style={{
            marginTop: 20,
            backgroundColor: "#EBF3FF",
            borderRadius: 12,
            padding: 14,
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
            <Ionicons name="information-circle" size={16} color="#1A5FAF" />
            <Text
              style={{ fontSize: 13, fontWeight: "700", color: "#1A5FAF" }}
            >
              신고 절차 안내
            </Text>
          </View>
          <Text
            style={{ fontSize: 12, color: "#185FA5", lineHeight: 18 }}
          >
            신고를 시작하면 진정서 초안 작성부터 노동청 제출까지 단계별로
            안내해드려요. 등록된 업장은 근무기록이 자동으로 붙습니다.
          </Text>
        </View>

        {/* 해결 후기 — empty 모드에서만 노출. 진행 중 사건이 없어도 동기부여용으로 보여줌. */}
        {!isAddNewCase ? (
          <>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#0F172A",
                marginTop: 28,
                marginBottom: 4,
              }}
            >
              해결 후기
            </Text>
            <Text
              style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}
            >
              먼저 신고한 분들의 경험을 미리 살펴보세요
            </Text>
            {reviews.slice(0, 2).map((review) => (
              <ResolveReviewCard
                key={review.id}
                review={review}
                onPressDetail={() => setViewingReviewId(review.id)}
              />
            ))}
            {/* "+ 내 해결 경험 공유하기" — 사건 무관 자유 작성 진입점 */}
            <Pressable
              onPress={() => setShowFreeReviewWrite(true)}
              style={{
                marginTop: 4,
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
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#3182F6" }}
              >
                + 내 해결 경험 공유하기
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

