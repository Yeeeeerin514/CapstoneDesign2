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
import { type MentorProfile } from "@/entities/mentor";
import { useMentorStore } from "@/features/mentor-match";
import type { DamageTypeEnum } from "@/entities/report";

interface MentorBrowseViewProps {
  /** 사건에서 자동 도출된 초기 필터값. */
  initialIndustry?: string;
  initialDamageTypes?: DamageTypeEnum[];
  initialRegion?: string;
  onBack: () => void;
  onSelect: (mentor: MentorProfile) => void;
}

const DAMAGE_LABEL: Record<DamageTypeEnum, string> = {
  BASE_WAGE: "임금 미지급",
  WEEKLY_HOLIDAY: "주휴수당",
  OVERTIME: "연장수당",
  NIGHT: "야간수당",
  SEVERANCE: "퇴직금",
};

const DAMAGE_OPTIONS: DamageTypeEnum[] = [
  "BASE_WAGE",
  "WEEKLY_HOLIDAY",
  "OVERTIME",
  "NIGHT",
  "SEVERANCE",
];

/** 칩 옵션 — mock 데이터에 등장하는 업종 + 일반 후보. */
const INDUSTRY_OPTIONS = [
  "카페·음식점",
  "편의점",
  "배달",
  "학원",
  "PC방",
  "제조",
  "사무·관리",
  "기타",
];

/** 칩 옵션 — mock 데이터에 등장하는 지역 + 광역 단위. */
const REGION_OPTIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "기타",
];

/**
 * 전체 멘토 검색 화면 — Top-3 추천 외에 사용자가 직접 멘토를 고르는 진입점.
 * 사건의 industry/damageTypes/region을 prefill해 첫 로드부터 관련 멘토만 보이게.
 */
export function MentorBrowseView({
  initialIndustry,
  initialDamageTypes,
  initialRegion,
  onBack,
  onSelect,
}: MentorBrowseViewProps): JSX.Element {
  const [industry, setIndustry] = useState<string>(initialIndustry ?? "");
  const [damageTypes, setDamageTypes] = useState<DamageTypeEnum[]>(
    initialDamageTypes ?? [],
  );
  const [region, setRegion] = useState<string>(initialRegion ?? "");
  const [query, setQuery] = useState("");

  /**
   * 클라이언트 필터링 — 우리 서비스에 등록된 모든 멘토(useMentorStore)에서 필터 조건에 맞는 사람만 노출.
   * 백엔드 API는 추후 연동 (현재는 mock + 사용자가 등록한 멘토 모두 클라이언트에서 처리).
   */
  const allMentors = useMentorStore((s) => s.mentors);

  const toggleDamage = (id: DamageTypeEnum): void => {
    setDamageTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  /** DamageTypeEnum → 한글 라벨 매핑 (mentor.damageTypes 문자열과 비교용). */
  const matchesDamageType = (
    mentorDamageTypes: string[],
    selected: DamageTypeEnum,
  ): boolean => {
    const label = DAMAGE_LABEL[selected];
    // 멘토 damageTypes는 한글 라벨 또는 enum-like 라벨. 양쪽 모두 매칭.
    return mentorDamageTypes.some(
      (d) =>
        d === label ||
        d === selected ||
        d.includes(label) ||
        // "임금체불" ↔ "BASE_WAGE" 매핑 보완
        (selected === "BASE_WAGE" && d.includes("임금")),
    );
  };

  const results = useMemo<MentorProfile[]>(() => {
    return allMentors.filter((m) => {
      if (industry.length > 0 && m.industry !== industry) return false;
      // 지역 매칭 — substring 양방향. mentor.region="서울"이고 query="서울 강남구"여도 OK.
      // 빈 region을 갖는 멘토는 region 필터 입력 시 제외.
      if (region.length > 0) {
        const mr = m.region ?? "";
        if (mr.length === 0) return false;
        if (!mr.includes(region) && !region.includes(mr)) return false;
      }
      if (
        damageTypes.length > 0 &&
        !damageTypes.some((d) => matchesDamageType(m.damageTypes, d))
      ) {
        return false;
      }
      if (query.length > 0) {
        const q = query.toLowerCase();
        const haystack = `${m.nickname} ${m.bio}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMentors, industry, region, damageTypes, query]);

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
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            멘토 전체 검색
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            필터를 조정해 원하는 멘토를 찾아보세요
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 검색어 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="search" size={14} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="멘토 닉네임·소개로 검색"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            style={{
              flex: 1,
              fontSize: 14,
              color: "#0F172A",
              paddingVertical: 12,
              paddingHorizontal: 8,
            }}
          />
        </View>

        {/* 업종 — 칩 선택 (같은 칩 다시 누르면 해제 = 전체) */}
        <Text
          style={{
            fontSize: 13,
            color: "#475569",
            fontWeight: "600",
            marginTop: 4,
            marginBottom: 6,
          }}
        >
          업종
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {INDUSTRY_OPTIONS.map((opt) => {
            const active = industry === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setIndustry(active ? "" : opt)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: active ? "#3182F6" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: active ? "#3182F6" : "#E2E8F0",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? "#FFFFFF" : "#475569",
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 지역 — 칩 선택 */}
        <Text
          style={{
            fontSize: 13,
            color: "#475569",
            fontWeight: "600",
            marginBottom: 6,
          }}
        >
          지역
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {REGION_OPTIONS.map((opt) => {
            const active = region === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setRegion(active ? "" : opt)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: active ? "#3182F6" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: active ? "#3182F6" : "#E2E8F0",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? "#FFFFFF" : "#475569",
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          style={{
            fontSize: 13,
            color: "#475569",
            fontWeight: "600",
            marginBottom: 6,
          }}
        >
          피해 유형
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {DAMAGE_OPTIONS.map((d) => {
            const active = damageTypes.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => toggleDamage(d)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: active ? "#3182F6" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: active ? "#3182F6" : "#E2E8F0",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? "#FFFFFF" : "#475569",
                  }}
                >
                  {DAMAGE_LABEL[d]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 필터 초기화 (필터를 적용했을 때만 노출) */}
        {industry.length > 0 ||
        region.length > 0 ||
        damageTypes.length > 0 ||
        query.length > 0 ? (
          <Pressable
            onPress={() => {
              setIndustry("");
              setRegion("");
              setDamageTypes([]);
              setQuery("");
            }}
            style={{
              marginTop: 16,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: "#F1F5F9",
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Text style={{ color: "#475569", fontSize: 13, fontWeight: "600" }}>
              필터 초기화 (전체 멘토 보기)
            </Text>
          </Pressable>
        ) : null}

        {/* 결과 — 필터는 reactive하게 즉시 반영 */}
        {(
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                fontSize: 13,
                color: "#475569",
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              {`총 ${results.length}명`}
            </Text>

            {results.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Ionicons name="search-outline" size={32} color="#94A3B8" />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#64748B",
                    marginTop: 10,
                    textAlign: "center",
                  }}
                >
                  조건에 맞는 멘토가 없어요{"\n"}필터를 넓혀보세요
                </Text>
              </View>
            ) : (
              results.map((m) => (
                <MentorCard
                  key={m.userId}
                  mentor={m}
                  onPress={() => onSelect(m)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MentorCard({
  mentor,
  onPress,
}: {
  mentor: MentorProfile;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 0.5,
        borderColor: "#E2E8F0",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}
          >
            {mentor.nickname}
          </Text>
          {mentor.badges.map((b) => (
            <View
              key={b}
              style={{
                backgroundColor: "#EBF3FF",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <Text
                style={{ fontSize: 10, color: "#185FA5", fontWeight: "700" }}
              >
                {b}
              </Text>
            </View>
          ))}
        </View>
        <Text
          style={{ fontSize: 13, color: "#DC2626", fontWeight: "600" }}
        >
          {`₩${mentor.consultingFee.toLocaleString()}`}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: "#64748B",
          marginTop: 4,
          lineHeight: 17,
        }}
        numberOfLines={2}
      >
        {mentor.bio}
      </Text>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          marginTop: 8,
        }}
      >
        <Text style={{ fontSize: 11, color: "#475569" }}>
          {`★ ${mentor.averageRating.toFixed(1)} (${mentor.reviewCount})`}
        </Text>
        <Text style={{ fontSize: 11, color: "#475569" }}>
          {`평균 ${mentor.resolvedDays}일`}
        </Text>
        <Text style={{ fontSize: 11, color: "#475569" }}>
          {mentor.industry}
        </Text>
      </View>
    </Pressable>
  );
}
