import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import {
  useReviewStore,
  INDUSTRY_OPTIONS,
  REGION_OPTIONS,
  DAMAGE_OPTIONS,
} from "@/entities/review";
import { ReviewDetailView } from "./ReviewDetailView";

interface ReviewListViewProps {
  onBack: () => void;
  /** HomeView "맞춤 해결 사례 보기" 진입 시 초기 업종 필터 ("전체" 또는 업종 라벨). */
  initialIndustry?: string;
}

/** 필터 칩 — 앞에 "전체"를 붙인 업종/지역/피해유형 목록. */
const INDUSTRY_FILTERS = ["전체", ...INDUSTRY_OPTIONS] as const;
const REGION_FILTERS = ["전체", ...REGION_OPTIONS] as const;
const DAMAGE_FILTERS = ["전체", ...DAMAGE_OPTIONS] as const;

export function ReviewListView({
  onBack,
  initialIndustry,
}: ReviewListViewProps): JSX.Element {
  const reviews = useReviewStore((s) => s.reviews);
  const markHelpful = useReviewStore((s) => s.markHelpful);

  const [industry, setIndustry] = useState<string>(initialIndustry ?? "전체");
  const [region, setRegion] = useState<string>("전체");
  const [damageType, setDamageType] = useState<string>("전체");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (industry !== "전체" && r.industry !== industry) return false;
      if (region !== "전체" && r.region !== region) return false;
      // 피해 유형: 선택한 유형이 후기의 damageTypes에 "포함"되면 통과.
      if (
        damageType !== "전체" &&
        !(r.damageTypes as string[]).includes(damageType)
      ) {
        return false;
      }
      return true;
    });
  }, [reviews, industry, region, damageType]);

  if (selectedId !== null) {
    return (
      <ReviewDetailView
        reviewId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

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
          해결 후기
        </Text>
      </View>

      {/* 필터 칩 — 업종 */}
      <View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: "#94A3B8",
            marginBottom: 6,
          }}
        >
          업종
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
        >
          {INDUSTRY_FILTERS.map((opt) => {
            const isActive = industry === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setIndustry(opt)}
                style={{
                  backgroundColor: isActive ? "#3182F6" : "#F1F5F9",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: isActive ? "#FFFFFF" : "#475569",
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 필터 칩 — 지역 */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: "#94A3B8",
            marginBottom: 6,
          }}
        >
          지역
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
        >
          {REGION_FILTERS.map((opt) => {
            const isActive = region === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setRegion(opt)}
                style={{
                  backgroundColor: isActive ? "#3182F6" : "#F1F5F9",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: isActive ? "#FFFFFF" : "#475569",
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 필터 칩 — 피해 유형 (선택 시 해당 유형이 포함된 후기만) */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: "#94A3B8",
            marginBottom: 6,
          }}
        >
          피해 유형
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
        >
          {DAMAGE_FILTERS.map((opt) => {
            const isActive = damageType === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setDamageType(opt)}
                style={{
                  backgroundColor: isActive ? "#3182F6" : "#F1F5F9",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: isActive ? "#FFFFFF" : "#475569",
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        {filteredReviews.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 32,
              alignItems: "center",
            }}
          >
            <Ionicons name="search-outline" size={32} color="#94A3B8" />
            <Text
              style={{
                fontSize: 13,
                color: "#64748B",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              조건에 맞는 후기가 아직 없어요
            </Text>
          </View>
        ) : (
          filteredReviews.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setSelectedId(r.id)}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                padding: 16,
                marginBottom: 10,
              }}
            >
              {/* 상단 메타 */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: "wrap",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: "#0F172A",
                    }}
                  >
                    {r.rating.toFixed(1)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: "#CBD5E1" }}>·</Text>
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  {r.industry}
                </Text>
                <Text style={{ fontSize: 12, color: "#CBD5E1" }}>·</Text>
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  {r.region}
                </Text>
                <Text style={{ fontSize: 12, color: "#CBD5E1" }}>·</Text>
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  {`${r.resolveDays}일 해결`}
                </Text>
              </View>

              {/* 제목 (2줄) */}
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#0F172A",
                  lineHeight: 21,
                  marginBottom: 8,
                }}
              >
                {r.title}
              </Text>

              {/* by + 배지 */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 4,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: "#475569" }}>
                  {`by ${r.authorNickname}`}
                </Text>
                {r.authorBadges.map((b) => (
                  <View
                    key={b}
                    style={{
                      backgroundColor: "#E8F2FF",
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#1B64DA",
                        fontWeight: "600",
                      }}
                    >
                      {b}
                    </Text>
                  </View>
                ))}
              </View>

              {/* 하단 액션 */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    markHelpful(r.id);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 8,
                    backgroundColor: "#F8FAFC",
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 4,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Ionicons
                    name="thumbs-up-outline"
                    size={12}
                    color="#475569"
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: "#475569",
                    }}
                  >
                    {`도움됐어요 ${r.helpfulCount}`}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
