import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScreenHeader } from "@/shared/ui";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";
import type {
  JobPostAnalysisResult,
  JobPostIssue,
} from "@/entities/job-post";

interface Props {
  result: JobPostAnalysisResult;
  onBack: () => void;
  onFavoriteAdded: () => void;
}

const LEVEL_COLOR: Record<
  JobPostIssue["level"],
  { bg: string; border: string; title: string; desc: string }
> = {
  danger: {
    bg: "#FEF2F2",
    border: "#EF4444",
    title: "#B91C1C",
    desc: "#DC2626",
  },
  warning: {
    bg: "#FEF9F0",
    border: "#F59E0B",
    title: "#92400E",
    desc: "#B45309",
  },
  info: {
    bg: "#EFF6FF",
    border: "#60A5FA",
    title: "#1D4ED8",
    desc: "#2563EB",
  },
};

export function JobAnalysisResultView({
  result,
  onBack,
  onFavoriteAdded: _onFavoriteAdded,
}: Props) {
  const router = useRouter();
  const addWorkplace = useFavoriteWorkplaceStore((s) => s.addWorkplace);
  const [isFavoriteAdded, setIsFavoriteAdded] = useState(false);

  const dangerCount = result.issues.filter((i) => i.level === "danger").length;
  const hasDanger = dangerCount > 0;
  const isBelowMinWage = result.hourlyWage < result.minimumWage2026;

  function handleAddFavorite() {
    if (isFavoriteAdded) {
      // 이미 등록됨 → overlay 닫고 관심업장 탭으로 이동
      onBack();
      router.push("/(tabs)/workplace");
    } else {
      // 처음 등록
      addWorkplace(result.workplaceName);
      setIsFavoriteAdded(true);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* 0. 알바지킴이 로고 배너 */}
      <ScreenHeader showLogo />

      {/* 1. 헤더 */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E2E8F0",
        }}
      >
        <Pressable
          onPress={onBack}
          style={{ padding: 4, marginRight: 8 }}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          공고 분석 결과
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 120,
          gap: 12,
        }}
      >
        {/* 2. 위험도 배너 */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: hasDanger ? "#FEF2F2" : "#F0FDF4",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: hasDanger ? "#B91C1C" : "#15803D",
              }}
            >
              {hasDanger
                ? `위험 요소 ${dangerCount}건 발견`
                : "이상 없음"}
            </Text>
            <Text
              style={{
                fontSize: 13,
                marginTop: 4,
                color: hasDanger ? "#DC2626" : "#16A34A",
              }}
            >
              {hasDanger
                ? "즉시 확인이 필요합니다"
                : "위험 요소가 발견되지 않았어요"}
            </Text>
          </View>
          <Ionicons
            name={hasDanger ? "warning" : "checkmark-circle"}
            size={28}
            color={hasDanger ? "#EF4444" : "#22C55E"}
          />
        </View>

        {/* 3. 업장 정보 카드 */}
        <View
          style={{
            backgroundColor: "#DBEAFE",
            borderRadius: 12,
            padding: 16,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E3A8A" }}>
              {result.workplaceName}
            </Text>
            <Pressable
              onPress={handleAddFavorite}
              hitSlop={8}
              style={{ padding: 4 }}
            >
              <Ionicons
                name={isFavoriteAdded ? "star" : "star-outline"}
                size={22}
                color="#2563EB"
              />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <InfoCell
              label="시급"
              value={`${result.hourlyWage.toLocaleString()}원`}
              valueColor={isBelowMinWage ? "#DC2626" : "#0F172A"}
            />
            <InfoCell label="근무 시간" value={result.workHours} />
            <InfoCell
              label="주휴수당"
              value={result.hasWeeklyHolidayPay ? "있음" : "미언급"}
              valueColor={
                result.hasWeeklyHolidayPay ? "#0F172A" : "#B45309"
              }
            />
            <InfoCell label="사업자 상태" value={result.businessStatus} />
          </View>
        </View>

        {/* 4. 문제 목록 */}
        {result.issues.map((issue, idx) => {
          const c = LEVEL_COLOR[issue.level];
          return (
            <View
              key={`${issue.title}-${idx}`}
              style={{
                backgroundColor: c.bg,
                borderLeftWidth: 4,
                borderLeftColor: c.border,
                borderRadius: 8,
                padding: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: c.title,
                }}
              >
                {issue.title}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: c.desc,
                  marginTop: 4,
                }}
              >
                {issue.description}
              </Text>
            </View>
          );
        })}

        {/* 5. 임금체불 이력 카드 */}
        {result.wageDelinquencyCount > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#FFF7ED",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <Ionicons name="alert-circle" size={20} color="#EA580C" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#9A3412" }}>
              체불이력 {result.wageDelinquencyCount}건
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#F0FDF4",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#15803D" }}>
              체불이력 없음
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 6. 하단 고정 버튼 */}
      <View
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 24,
        }}
      >
        <TouchableOpacity
          onPress={handleAddFavorite}
          activeOpacity={0.85}
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isFavoriteAdded ? "#10B981" : "#2563EB",
            paddingVertical: 16,
            borderRadius: 14,
            shadowColor: isFavoriteAdded ? "#10B981" : "#2563EB",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
            {isFavoriteAdded ? "관심업장 보러가기 →" : "☆ 관심업장으로 등록"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface InfoCellProps {
  label: string;
  value: string;
  valueColor?: string;
}

function InfoCell({ label, value, valueColor = "#0F172A" }: InfoCellProps) {
  return (
    <View
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        padding: 12,
      }}
    >
      <Text style={{ fontSize: 12, color: "#64748B" }}>{label}</Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: valueColor,
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
