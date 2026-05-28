/**
 * Phase 1 — 백엔드 매칭 시스템 기반 멘토 추천 화면.
 *
 * 기존 MentorRecommendView (mock 기반)와 별도. 진정서 wizard에서 사건 컨텍스트를
 * 받아 백엔드 /api/mentoring/match-request를 호출하고, Gower distance + Gale-Shapley
 * + Thompson Sampling으로 매칭된 top-K 멘토를 매칭도 게이지 + 추천 이유와 함께 표시.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, colors, radius, spacing, typography } from "@/shared/ui";
import {
  confirmMatch,
  requestMatch,
  type BusinessSize,
  type DamageType,
  type EmploymentType,
  type Industry,
  type MatchRecommendation,
  type MatchResponseEnvelope,
  type RegionCode,
} from "@/entities/mentor";

const FEATURE_LABEL: Record<string, string> = {
  damageTypes: "피해 유형",
  industry: "업종",
  businessSize: "사업장 규모",
  employmentType: "고용 형태",
  damageAmountRange: "피해 금액",
  region: "지역",
  resolutionMethods: "해결 경험",
};

interface Props {
  caseId?: number | null;
  industry: Industry;
  damageTypes: DamageType[];
  businessSize: BusinessSize;
  employmentType?: EmploymentType;
  region?: RegionCode;
  description?: string;
  onBack: () => void;
  onMatched?: (matchId: number, mentorNickname: string) => void;
}

export function SmartMentorRecommendView({
  caseId,
  industry,
  damageTypes,
  businessSize,
  employmentType,
  region,
  description,
  onBack,
  onMatched,
}: Props): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [envelope, setEnvelope] = useState<MatchResponseEnvelope | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [stage, setStage] = useState<"검색" | "필터" | "매칭" | "완료">("검색");

  useEffect(() => {
    (async () => {
      try {
        // 단계별 시각 효과
        setStage("검색");
        await delay(700);
        setStage("필터");
        await delay(600);
        setStage("매칭");
        const result = await requestMatch({
          caseId,
          industry,
          damageTypes,
          employmentType,
          businessSize,
          region,
          description,
          topK: 3,
        });
        setEnvelope(result);
        setStage("완료");
      } catch (err) {
        Alert.alert(
          "매칭 실패",
          err instanceof Error ? err.message : "잠시 후 다시 시도해주세요",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleConfirm(rec: MatchRecommendation): Promise<void> {
    setConfirmingId(rec.matchId);
    try {
      await confirmMatch(rec.matchId);
      Alert.alert(
        "매칭 완료",
        `${rec.mentorNickname} 멘토와 매칭됐어요.`,
        [{ text: "확인", onPress: () => onMatched?.(rec.matchId, rec.mentorNickname) }],
      );
    } catch (err) {
      Alert.alert("매칭 실패", err instanceof Error ? err.message : "다시 시도해주세요");
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader showLogo />
      <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: spacing.sm }}>
        <Pressable onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={typography.title1}>멘토 매칭</Text>
      </View>

      {loading || envelope === null ? (
        <LoadingProgress stage={stage} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
          <AlgorithmBadge algorithm={envelope.algorithm} count={envelope.recommendations.length} />

          {envelope.recommendations.length === 0 ? (
            <View style={emptyCard}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center" }}>
                지금은 매칭 가능한 멘토가 없어요.{"\n"}
                나중에 다시 시도해주세요.
              </Text>
            </View>
          ) : (
            envelope.recommendations.map((rec) => (
              <MentorMatchCard
                key={rec.matchId}
                rec={rec}
                isConfirming={confirmingId === rec.matchId}
                onConfirm={() => handleConfirm(rec)}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  매칭 카드 (매칭도 게이지 + 추천 이유 + SHAP 기여도)
// ─────────────────────────────────────────────────────────────────

function MentorMatchCard({
  rec, isConfirming, onConfirm,
}: {
  rec: MatchRecommendation;
  isConfirming: boolean;
  onConfirm: () => void;
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const matchPercent = Math.round(rec.matchScore * 100);
  const tone = matchPercent >= 80 ? "high" : matchPercent >= 60 ? "mid" : "low";
  const toneColor = tone === "high" ? "#16A34A" : tone === "mid" ? "#F59E0B" : "#94A3B8";
  const toneBg = tone === "high" ? "#DCFCE7" : tone === "mid" ? "#FEF3C7" : "#F1F5F9";

  // 기여도 차트용 정렬된 항목들
  const contributionEntries = Object.entries(rec.contributions)
    .filter(([, v]) => v !== undefined && v !== null && (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  const maxContribution = Math.max(...contributionEntries.map(([, v]) => v as number), 0.01);

  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      {/* 헤더: 순위 + 닉네임 + 매칭도 게이지 */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 26, height: 26, borderRadius: 13,
              backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{rec.rank}</Text>
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{rec.mentorNickname}</Text>
              {rec.isVerified && (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              )}
            </View>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              {rec.industry ?? "업종 미상"} · 후기 {rec.reviewCount}건 · ★ {rec.averageRating.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* 매칭도 뱃지 */}
        <View style={{ backgroundColor: toneBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: toneColor, fontWeight: "700" }}>
            매칭도 {matchPercent}%
          </Text>
        </View>
      </View>

      {/* 매칭도 게이지 바 */}
      <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, marginBottom: 12 }}>
        <View
          style={{
            height: 6, borderRadius: 3,
            width: `${matchPercent}%`,
            backgroundColor: toneColor,
          }}
        />
      </View>

      {/* 추천 이유 칩 */}
      {rec.matchReasons.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          {rec.matchReasons.map((r, i) => (
            <View key={i} style={reasonChip}>
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>✓ {r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 자기소개 */}
      {rec.bio !== null && rec.bio.length > 0 && (
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10, lineHeight: 18 }}>
          {rec.bio}
        </Text>
      )}

      {/* 펼치기: 항목별 기여도 (SHAP-style) */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: expanded ? 10 : 0 }}
      >
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
          {expanded ? "기여도 접기" : "추천 이유 자세히 보기"}
        </Text>
      </Pressable>

      {expanded && (
        <View
          style={{
            backgroundColor: "#F8FAFC",
            borderRadius: radius.sm,
            padding: 10,
            marginBottom: 10,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }}>
            이 멘토가 추천된 이유 (Gower distance × Thompson Sampling 가중치)
          </Text>
          {contributionEntries.map(([feature, value]) => {
            const v = value as number;
            const pct = (v / maxContribution) * 100;
            return (
              <View key={feature}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 11, color: colors.text }}>
                    {FEATURE_LABEL[feature] ?? feature}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {(v * 100).toFixed(1)}%
                  </Text>
                </View>
                <View style={{ height: 4, backgroundColor: "#E2E8F0", borderRadius: 2 }}>
                  <View
                    style={{
                      height: 4, borderRadius: 2,
                      width: `${pct}%`,
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 액션 버튼 */}
      <Pressable
        onPress={onConfirm}
        disabled={isConfirming}
        style={{
          paddingVertical: 11,
          backgroundColor: isConfirming ? "#9CA3AF" : colors.primary,
          borderRadius: radius.md,
          alignItems: "center",
        }}
      >
        {isConfirming ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
            이 멘토와 매칭하기 · ₩{rec.consultingFee.toLocaleString()}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
//  진행 상황 표시 + 알고리즘 뱃지
// ─────────────────────────────────────────────────────────────────

function LoadingProgress({ stage }: { stage: string }): JSX.Element {
  const stages = ["검색", "필터", "매칭", "완료"];
  const idx = stages.indexOf(stage);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: spacing.md, fontSize: 14, fontWeight: "700", color: colors.text }}>
        AI 매칭 분석 중…
      </Text>
      <View style={{ marginTop: spacing.lg, gap: 8, alignSelf: "stretch" }}>
        {stages.map((s, i) => {
          const done = i <= idx;
          return (
            <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons
                name={done ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={done ? colors.primary : colors.textSecondary}
              />
              <Text style={{ fontSize: 12, color: done ? colors.text : colors.textSecondary }}>
                {stageLabel(s)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "검색": return "멘토 풀 조회";
    case "필터": return "Gower 거리 계산 + 캐파 필터";
    case "매칭": return "Gale-Shapley 안정 매칭 실행";
    case "완료": return "Top-K 추천 결과 정리";
    default: return stage;
  }
}

function AlgorithmBadge({ algorithm, count }: { algorithm: string; count: number }): JSX.Element {
  return (
    <View
      style={{
        backgroundColor: colors.primaryLight,
        padding: 10,
        borderRadius: radius.md,
        marginBottom: spacing.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <Ionicons name="git-network" size={14} color={colors.primary} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
          {count}명의 멘토가 매칭됐어요
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.primary }}>
        알고리즘: {algorithm}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
//  스타일
// ─────────────────────────────────────────────────────────────────

const emptyCard = {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  padding: spacing.xl,
} as const;

const reasonChip = {
  backgroundColor: colors.primaryLight,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 10,
} as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
