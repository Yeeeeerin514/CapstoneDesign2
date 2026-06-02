import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";

interface WageIssueAnalyzerViewProps {
  onClose: () => void;
  /** "비슷한 사례 보기 →" 클릭 시 — 상위가 ReviewListView를 industry 필터로 오픈. */
  onShowSimilarCases: (params: {
    industry: ReviewIndustry;
    damageTypeTags: string[];
  }) => void;
}

/**
 * HomeView "내 임금체불 유형 분석하여 맞춤 해결 사례 보기" 진입점에서 띄우는 분석 시트.
 * 사용자가 간단히 체크한 정보로 ReviewListView 필터를 자동 적용해서 진입.
 */
export type WageIssueIndustry =
  | "카페"
  | "음식점"
  | "편의점"
  | "매장·판매"
  | "배달·물류"
  | "사무"
  | "기타";

const INDUSTRIES: WageIssueIndustry[] = [
  "카페",
  "음식점",
  "편의점",
  "매장·판매",
  "배달·물류",
  "사무",
  "기타",
];

/** ReviewListView가 받는 INDUSTRY_FILTERS와 동일한 union (외부 노출). */
export type ReviewIndustry = "전체" | "카페·음식점" | "편의점" | "배달";

/** 입력 업종 → ReviewListView 필터 매핑. */
function mapToReviewIndustry(input: WageIssueIndustry): ReviewIndustry {
  switch (input) {
    case "카페":
    case "음식점":
      return "카페·음식점";
    case "편의점":
      return "편의점";
    case "배달·물류":
      return "배달";
    default:
      return "전체";
  }
}

interface DamageOption {
  id: string;
  label: string;
  /** "이렇게 이해했어요" 자동 분류 태그. */
  tag: string;
}

const DAMAGE_OPTIONS: DamageOption[] = [
  {
    id: "monthly-full",
    label: "받기로 한 월급을 일부 / 전부 못 받았어요",
    tag: "기본급 미지급",
  },
  {
    id: "last-pay",
    label: "그만뒀는데 마지막 급여·퇴직금을 못 받았어요",
    tag: "회차당 미지급",
  },
  {
    id: "less-than-expected",
    label: "받긴 받았는데 뭔가 덜 받은 것 같아요",
    tag: "주휴수당 미지급",
  },
];

const MIN_WAGE_2026 = 10_030;

export function WageIssueAnalyzerView({
  onClose,
  onShowSimilarCases,
}: WageIssueAnalyzerViewProps): JSX.Element {
  const [industry, setIndustry] = useState<WageIssueIndustry | null>(null);
  const [selectedDamageIds, setSelectedDamageIds] = useState<string[]>([]);
  const [hourlyWage, setHourlyWage] = useState<string>("");
  const [daysPerWeek, setDaysPerWeek] = useState<string>("");
  const [hoursPerDay, setHoursPerDay] = useState<string>("");
  const [employment, setEmployment] = useState<"current" | "former" | null>(
    null,
  );
  /** 자동 분류 태그 + 사용자가 직접 추가/제거한 태그. */
  const [customTags, setCustomTags] = useState<string[] | null>(null);

  const wageNum = parseInt(hourlyWage.replace(/,/g, ""), 10);
  const wageBelowMin =
    Number.isFinite(wageNum) && wageNum > 0 && wageNum < MIN_WAGE_2026;

  const totalWeekHours =
    parseFloat(daysPerWeek || "0") * parseFloat(hoursPerDay || "0");
  const eligibleWeeklyHoliday = totalWeekHours >= 15;

  /** 선택된 damage 옵션의 자동 태그. customTags가 null이면 자동 사용. */
  const autoTags = useMemo<string[]>(() => {
    const tags = selectedDamageIds
      .map((id) => DAMAGE_OPTIONS.find((o) => o.id === id)?.tag)
      .filter((t): t is string => t !== undefined);
    // 주 15시간 이상이면 "주휴수당 미지급" 자동 추가
    if (eligibleWeeklyHoliday && !tags.includes("주휴수당 미지급")) {
      tags.push("주휴수당 미지급");
    }
    // 최저임금 미만이면 "최저임금 미달" 자동 추가
    if (wageBelowMin && !tags.includes("최저임금 미달")) {
      tags.push("최저임금 미달");
    }
    return tags;
  }, [selectedDamageIds, eligibleWeeklyHoliday, wageBelowMin]);

  const tags = customTags ?? autoTags;

  const toggleDamage = (id: string): void => {
    setSelectedDamageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setCustomTags(null); // 옵션 변경 시 자동 분류로 reset
  };

  const removeTag = (tag: string): void => {
    setCustomTags(tags.filter((t) => t !== tag));
  };

  const canSubmit = industry !== null && selectedDamageIds.length > 0;

  const handleShowSimilar = (): void => {
    if (!canSubmit || industry === null) return;
    onShowSimilarCases({
      industry: mapToReviewIndustry(industry),
      damageTypeTags: tags,
    });
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
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
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={24} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          비슷한 사례 찾기
        </Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          color: "#64748B",
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
      >
        몇 가지만 알려주면, 나머지는 앱이 알아서 짚어드려요
      </Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 24 }}
      >
        {/* 1. 어디서 알바했나요? */}
        <SectionTitle text="어디서 알바했나요?" required />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {INDUSTRIES.map((ind) => {
            const isActive = industry === ind;
            return (
              <Pressable
                key={ind}
                onPress={() => setIndustry(ind)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? "#3182F6" : "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isActive ? "#FFFFFF" : "#475569",
                  }}
                >
                  {ind}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 2. 무엇을 못 받았나요? */}
        <SectionTitle text="무엇을 못 받았나요?" required />
        <View style={{ gap: 8, marginBottom: 20 }}>
          {DAMAGE_OPTIONS.map((opt) => {
            const isActive = selectedDamageIds.includes(opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => toggleDamage(opt.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: isActive ? "#EBF3FF" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isActive ? "#3182F6" : "#E2E8F0",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? "600" : "500",
                    color: isActive ? "#185FA5" : "#0F172A",
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 3. 근무 조건 (선택) */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <SectionTitle text="근무 조건 · 선택" required={false} />
          <Text style={{ fontSize: 11, color: "#94A3B8" }}>
            넣으면 더 정확해요
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>
          시급은 얼마였나요?
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: wageBelowMin ? "#F87171" : "#E2E8F0",
            paddingHorizontal: 12,
            marginBottom: 8,
          }}
        >
          <TextInput
            value={hourlyWage}
            onChangeText={(v) => setHourlyWage(v.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
            placeholder="10,000"
            placeholderTextColor="#94A3B8"
            style={{
              flex: 1,
              fontSize: 15,
              color: "#0F172A",
              paddingVertical: 12,
            }}
          />
          <Text style={{ fontSize: 14, color: "#64748B" }}>원</Text>
        </View>
        {wageBelowMin ? (
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 8,
              padding: 8,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 12, color: "#B91C1C" }}>
              {`⚠️ 2026년 최저시급 ₩${MIN_WAGE_2026.toLocaleString()}원보다 낮아요`}
            </Text>
          </View>
        ) : null}

        <Text style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>
          보통 주 며칠, 하루 몇 시간?
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <NumInput
            value={daysPerWeek}
            onChange={(v) => setDaysPerWeek(v.replace(/[^0-9]/g, ""))}
            unit="일"
            prefix="주"
            placeholder="5"
          />
          <NumInput
            value={hoursPerDay}
            onChange={(v) => setHoursPerDay(v.replace(/[^0-9.]/g, ""))}
            unit="시간"
            prefix="하루"
            placeholder="6"
          />
        </View>
        {eligibleWeeklyHoliday ? (
          <Text
            style={{ fontSize: 11, color: "#3B6D11", marginBottom: 16 }}
          >
            ✓ 주 30시간 = 주 15시간 이상이라 주휴수당 대상이에요
          </Text>
        ) : (
          <View style={{ marginBottom: 16 }} />
        )}

        {/* 4. 지금도 다니고 있나요? */}
        <SectionTitle text="지금도 다니고 있나요?" required={false} />
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {(
            [
              ["current", "재직중"],
              ["former", "그만뒀어요"],
            ] as const
          ).map(([id, label]) => {
            const isActive = employment === id;
            return (
              <Pressable
                key={id}
                onPress={() => setEmployment(id)}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: isActive ? "#3182F6" : "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isActive ? "#FFFFFF" : "#475569",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 5. 자동 분류 태그 */}
        {tags.length > 0 ? (
          <View
            style={{
              backgroundColor: "#EBF3FF",
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              borderWidth: 0.5,
              borderColor: "#B5D4F4",
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
              <Ionicons name="bulb" size={14} color="#185FA5" />
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#185FA5" }}
              >
                이렇게 이해했어요
              </Text>
            </View>
            <Text
              style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}
            >
              맞으면 그대로 두고, 아니면 빼거나 추가하세요
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderWidth: 0.5,
                    borderColor: "#B5D4F4",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#185FA5",
                      fontWeight: "600",
                    }}
                  >
                    {tag}
                  </Text>
                  <Pressable onPress={() => removeTag(tag)} hitSlop={4}>
                    <Text style={{ fontSize: 11, color: "#94A3B8" }}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={handleShowSimilar}
          disabled={!canSubmit}
          style={{
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: canSubmit ? "#1A5FAF" : "#CBD5E1",
            marginBottom: 10,
          }}
        >
          <Text
            style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
          >
            비슷한 사례 보기 →
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          style={{
            paddingVertical: 11,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#888888", fontSize: 13 }}>
            그냥 둘러볼게요
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────
// 내부 서브 컴포넌트
// ──────────────────────────────────────

function SectionTitle({
  text,
  required,
}: {
  text: string;
  required: boolean;
}): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}>
        {text}
      </Text>
      {required ? (
        <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "600" }}>
          필수
        </Text>
      ) : null}
    </View>
  );
}

function NumInput({
  value,
  onChange,
  unit,
  prefix,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  prefix: string;
  placeholder: string;
}): JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ fontSize: 13, color: "#64748B", marginRight: 6 }}>
        {prefix}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={{
          flex: 1,
          fontSize: 15,
          color: "#0F172A",
          paddingVertical: 12,
        }}
      />
      <Text style={{ fontSize: 13, color: "#64748B" }}>{unit}</Text>
    </View>
  );
}
