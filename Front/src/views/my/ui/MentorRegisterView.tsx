import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, colors, radius, spacing, typography } from "@/shared/ui";
import {
  BUSINESS_SIZE_LABEL,
  DAMAGE_AMOUNT_LABEL,
  DAMAGE_TYPE_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  INDUSTRY_LABEL,
  REGION_LABEL,
  RESOLUTION_METHOD_LABEL,
  fetchMyMentorProfile,
  registerMentor,
  type BusinessSize,
  type DamageAmountRange,
  type DamageType,
  type EmploymentType,
  type Industry,
  type RegionCode,
  type ResolutionMethod,
} from "@/entities/mentor";

interface Props {
  onBack: () => void;
  onSaved?: () => void;
}

export function MentorRegisterView({ onBack, onSaved }: Props): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 필수 항목
  const [nickname, setNickname] = useState("");
  const [industry, setIndustry] = useState<Industry>("OTHER");
  const [damageTypes, setDamageTypes] = useState<DamageType[]>([]);
  const [businessSize, setBusinessSize] = useState<BusinessSize>("UNKNOWN");

  // 선택 항목
  const [employmentType, setEmploymentType] = useState<EmploymentType | undefined>();
  const [region, setRegion] = useState<RegionCode | undefined>();
  const [resolutionMethods, setResolutionMethods] = useState<ResolutionMethod[]>([]);
  const [resolutionDays, setResolutionDays] = useState<string>("");
  const [damageAmountRange, setDamageAmountRange] = useState<DamageAmountRange | undefined>();
  const [bio, setBio] = useState("");
  const [capacity, setCapacity] = useState("3");
  const [consultingFee, setConsultingFee] = useState("10000");

  useEffect(() => {
    (async () => {
      try {
        const existing = await fetchMyMentorProfile();
        if (existing !== null) {
          setNickname(existing.nickname ?? "");
          setIndustry(existing.industry);
          setDamageTypes(existing.damageTypes ?? []);
          setBusinessSize(existing.businessSize);
          setEmploymentType(existing.employmentType ?? undefined);
          setRegion(existing.region ?? undefined);
          setResolutionMethods(existing.resolutionMethods ?? []);
          setDamageAmountRange(existing.damageAmountRange ?? undefined);
          setBio(existing.bio ?? "");
          setCapacity(String(existing.capacity ?? 3));
          setConsultingFee(String(existing.consultingFee ?? 10000));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleArray<T>(arr: T[], setter: (v: T[]) => void, value: T): void {
    if (arr.includes(value)) setter(arr.filter((v) => v !== value));
    else setter([...arr, value]);
  }

  async function handleSave(): Promise<void> {
    if (industry === "OTHER" && damageTypes.length === 0) {
      Alert.alert("입력 필요", "최소 업종과 피해 유형 1개를 선택하세요.");
      return;
    }
    setSaving(true);
    try {
      await registerMentor({
        nickname: nickname.trim() || undefined,
        industry,
        damageTypes,
        employmentType,
        businessSize,
        region,
        resolutionMethods,
        resolutionDays: resolutionDays ? Number(resolutionDays) : undefined,
        damageAmountRange,
        bio: bio.trim() || undefined,
        capacity: Number(capacity) || 3,
        consultingFee: Number(consultingFee) || 10000,
      });
      Alert.alert("등록 완료", "멘토 프로필이 저장되었습니다.");
      onSaved?.();
      onBack();
    } catch (err) {
      Alert.alert("저장 실패", err instanceof Error ? err.message : "잠시 후 다시 시도해주세요");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader showLogo />
      <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: spacing.sm }}>
        <Pressable onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={typography.title1}>멘토 프로필 등록</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Banner
          tone="primary"
          icon="people"
          title="우리 매칭 알고리즘이 사용하는 정보예요"
          body="입력값이 정확할수록 비슷한 피해를 겪고 해결한 사람과 매칭됩니다. Gower 거리 + Gale-Shapley 안정 매칭 + Thompson Sampling 학습에 사용돼요."
        />

        <Section title="닉네임">
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="예: 알바해방러"
            style={inputStyle}
            placeholderTextColor={colors.textSecondary}
          />
        </Section>

        <Section title="업종 *">
          <ChipGrid
            options={Object.entries(INDUSTRY_LABEL) as [Industry, string][]}
            isSelected={(v) => industry === v}
            onPress={(v) => setIndustry(v)}
          />
        </Section>

        <Section title="경험한 피해 유형 * (다중 선택)">
          <ChipGrid
            options={Object.entries(DAMAGE_TYPE_LABEL) as [DamageType, string][]}
            isSelected={(v) => damageTypes.includes(v)}
            onPress={(v) => toggleArray(damageTypes, setDamageTypes, v)}
          />
        </Section>

        <Section title="사업장 규모">
          <ChipGrid
            options={Object.entries(BUSINESS_SIZE_LABEL) as [BusinessSize, string][]}
            isSelected={(v) => businessSize === v}
            onPress={(v) => setBusinessSize(v)}
          />
        </Section>

        <Section title="고용 형태">
          <ChipGrid
            options={Object.entries(EMPLOYMENT_TYPE_LABEL) as [EmploymentType, string][]}
            isSelected={(v) => employmentType === v}
            onPress={(v) => setEmploymentType(employmentType === v ? undefined : v)}
          />
        </Section>

        <Section title="지역 (시·도)">
          <ChipGrid
            options={Object.entries(REGION_LABEL) as [RegionCode, string][]}
            isSelected={(v) => region === v}
            onPress={(v) => setRegion(region === v ? undefined : v)}
          />
        </Section>

        <Section title="해결 방법 (다중 선택)">
          <ChipGrid
            options={Object.entries(RESOLUTION_METHOD_LABEL) as [ResolutionMethod, string][]}
            isSelected={(v) => resolutionMethods.includes(v)}
            onPress={(v) => toggleArray(resolutionMethods, setResolutionMethods, v)}
          />
        </Section>

        <Section title="해결 소요 일수 (대략)">
          <TextInput
            value={resolutionDays}
            onChangeText={setResolutionDays}
            placeholder="예: 30"
            keyboardType="number-pad"
            style={inputStyle}
            placeholderTextColor={colors.textSecondary}
          />
        </Section>

        <Section title="피해 금액 구간 (당시)">
          <ChipGrid
            options={Object.entries(DAMAGE_AMOUNT_LABEL) as [DamageAmountRange, string][]}
            isSelected={(v) => damageAmountRange === v}
            onPress={(v) => setDamageAmountRange(damageAmountRange === v ? undefined : v)}
          />
        </Section>

        <Section title="자기소개 / 도와줄 수 있는 영역 (200자)">
          <TextInput
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, 200))}
            multiline
            placeholder="예: 배달 라이더로 3년 일하다 5인 미만 카페에서 주휴수당 못 받아서 노동청에 진정 넣고 한 달 만에 받아냈음."
            style={[inputStyle, { minHeight: 100, textAlignVertical: "top" }]}
            placeholderTextColor={colors.textSecondary}
          />
        </Section>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Section title="동시 멘티 수" style={{ flex: 1 }}>
            <TextInput
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
              style={inputStyle}
            />
          </Section>
          <Section title="상담료(원)" style={{ flex: 1 }}>
            <TextInput
              value={consultingFee}
              onChangeText={setConsultingFee}
              keyboardType="number-pad"
              style={inputStyle}
            />
          </Section>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          backgroundColor: "#fff",
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          padding: spacing.lg,
        }}
      >
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingVertical: 14,
            backgroundColor: saving ? "#9CA3AF" : colors.primary,
            borderRadius: radius.md,
            alignItems: "center",
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>저장하기</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  유틸 컴포넌트
// ─────────────────────────────────────────────────────────────────

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.sm,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.text,
  backgroundColor: "#fff",
} as const;

function Section({ title, children, style }: { title: string; children: React.ReactNode; style?: object }): JSX.Element {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}

function ChipGrid<T extends string>({
  options,
  isSelected,
  onPress,
}: {
  options: [T, string][];
  isSelected: (v: T) => boolean;
  onPress: (v: T) => void;
}): JSX.Element {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {options.map(([value, label]) => {
        const selected = isSelected(value);
        return (
          <Pressable
            key={value}
            onPress={() => onPress(value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primaryLight : "#fff",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: selected ? colors.primary : colors.text,
                fontWeight: selected ? "700" : "500",
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Banner({
  tone, icon, title, body,
}: {
  tone: "primary" | "info";
  icon: "people" | "information-circle";
  title: string;
  body: string;
}): JSX.Element {
  const bg = tone === "primary" ? colors.primaryLight : "#F0F9FF";
  const fg = tone === "primary" ? colors.primary : "#075985";
  return (
    <View style={{ backgroundColor: bg, padding: 12, borderRadius: radius.md, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Ionicons name={icon} size={16} color={fg} />
        <Text style={{ color: fg, fontWeight: "700", fontSize: 13 }}>{title}</Text>
      </View>
      <Text style={{ color: fg, fontSize: 12, lineHeight: 18 }}>{body}</Text>
    </View>
  );
}
