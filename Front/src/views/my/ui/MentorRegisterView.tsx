import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
  registerMentor,
  type BusinessSize,
  type DamageAmountRange,
  type DamageType,
  type EmploymentType,
  type Industry,
  type Region,
  type ResolutionMethod,
  type VerificationMethod,
} from "@/entities/mentor";

interface Props {
  onBack: () => void;
  onSaved?: () => void;
  /**
   * 자격 검증 정보 — MyView 게이트에서 자동 전달.
   * 누락 시 백엔드가 거부 (이미 등록된 멘토는 예외).
   */
  verification?: {
    method: VerificationMethod;
    verifiedCaseIds?: number[];
    evidenceUrls?: string[];
  };
}

interface EvidenceItem {
  uri: string;
  url: string;
  uploading?: boolean;
  error?: string;
}

interface MyResolvedReport {
  id: number;
  workplaceName: string;
  createdAt: string;
}

export const MAX_EVIDENCE_URLS = 5;

function toggleArray<T>(
  arr: T[],
  setter: (next: T[]) => void,
  value: T,
): void {
  setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
}

export function MentorRegisterView({ onBack, onSaved, verification }: Props): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 필수 항목
  const [nickname, setNickname] = useState("");
  const [industry, setIndustry] = useState<Industry>("OTHER");
  const [damageTypes, setDamageTypes] = useState<DamageType[]>([]);
  const [businessSize, setBusinessSize] = useState<BusinessSize>("UNKNOWN");

  // 선택 항목
  const [employmentType, setEmploymentType] = useState<EmploymentType | undefined>();
  const [region, setRegion] = useState<Region | undefined>();
  const [resolutionMethods, setResolutionMethods] = useState<ResolutionMethod[]>([]);
  const [resolutionDays, setResolutionDays] = useState<string>("");
  const [damageAmountRange, setDamageAmountRange] = useState<DamageAmountRange | undefined>();
  const [bio, setBio] = useState("");
  const [capacity, setCapacity] = useState("3");
  const [consultingFee, setConsultingFee] = useState("10000");

  // 자격 검증 (외부 prop을 초기값으로 받되 화면에서 자유롭게 변경 가능)
  const [verificationMethod, setVerificationMethod] =
    useState<VerificationMethod | null>(verification?.method ?? null);
  const [verifiedCaseIds, setVerifiedCaseIds] = useState<number[]>(
    verification?.verifiedCaseIds ?? [],
  );
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(
    (verification?.evidenceUrls ?? []).map((url) => ({ uri: url, url })),
  );
  // RESOLVED_CASE 분기 — 사용자의 해결된 신고 사건 목록
  const [resolvedReports, setResolvedReports] = useState<MyResolvedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // 미사용 setter 경고 회피 — 기능은 stub 단계
  void setLoading;
  void setVerificationMethod;
  void setVerifiedCaseIds;
  void setEvidenceItems;
  void setResolvedReports;
  void setLoadingReports;

  const canSave =
    nickname.trim().length > 0 && damageTypes.length > 0;
  const evidenceUrls = evidenceItems.map((e) => e.url).filter((u) => u.length > 0);

  function showInactiveToast(): void {
    Alert.alert(
      "입력 확인",
      "필수 항목(닉네임·피해 유형)을 모두 입력해주세요.",
    );
  }

  function selectVerificationMethod(m: VerificationMethod): void {
    setVerificationMethod(m);
  }

  function toggleCaseId(id: number): void {
    setVerifiedCaseIds(
      verifiedCaseIds.includes(id)
        ? verifiedCaseIds.filter((x) => x !== id)
        : [...verifiedCaseIds, id],
    );
  }

  function removeEvidence(idx: number): void {
    setEvidenceItems(evidenceItems.filter((_, i) => i !== idx));
  }

  async function pickEvidence(): Promise<void> {
    // 자격 증빙 자료 업로드 — 추후 ImagePicker + uploadMentorEvidence 연결.
    Alert.alert("준비 중", "증빙 자료 업로드 기능은 곧 출시됩니다.");
  }

  async function handleSave(): Promise<void> {
    if (industry === "OTHER" && damageTypes.length === 0) {
      Alert.alert("입력 필요", "최소 업종과 피해 유형 1개를 선택하세요.");
      return;
    }
    if (!canSave) {
      showInactiveToast();
      return;
    }
    setSaving(true);
    try {
      // 백엔드 contract: MentorRegistrationRequest 모든 필드 required.
      // 미입력 시 합당한 enum 기본값/0/""을 채워 보낸다.
      await registerMentor({
        nickname: nickname.trim(),
        industry,
        damageTypes,
        employmentType: employmentType ?? "OTHER",
        businessSize,
        region: region ?? "OTHER",
        resolutionMethods,
        resolutionDays: resolutionDays ? Number(resolutionDays) : 0,
        damageAmountRange: damageAmountRange ?? "UNDER_100K",
        bio: bio.trim(),
        capacity: Number(capacity) || 3,
        consultingFee: Number(consultingFee) || 10000,
        // 자격 검증 — 화면에서 선택된 값 우선, canSave 통과 보장
        verificationMethod: verificationMethod as VerificationMethod,
        verifiedCaseIds:
          verificationMethod === "RESOLVED_CASE" ? verifiedCaseIds : undefined,
        evidenceUrls:
          verificationMethod === "EVIDENCE_UPLOAD" ? evidenceUrls : undefined,
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
            options={Object.entries(REGION_LABEL) as [Region, string][]}
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

        {/* 자격 검증 — STEP 20 */}
        <Section title="자격 검증 방법 *">
          <RadioOption
            label="앱에서 해결한 사건이 있어요"
            selected={verificationMethod === "RESOLVED_CASE"}
            onPress={() => selectVerificationMethod("RESOLVED_CASE")}
          />
          <RadioOption
            label="증빙 자료를 업로드할게요"
            selected={verificationMethod === "EVIDENCE_UPLOAD"}
            onPress={() => selectVerificationMethod("EVIDENCE_UPLOAD")}
          />
        </Section>

        {verificationMethod === "RESOLVED_CASE" ? (
          <Section title="해결한 사건 선택 (다중)">
            {loadingReports ? (
              <ActivityIndicator color={colors.primary} />
            ) : resolvedReports.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: radius.sm,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  해결된(RESOLVED) 신고 사건이 아직 없어요.
                </Text>
              </View>
            ) : (
              resolvedReports.map((r) => {
                const idNum = Number(r.id);
                const selected = verifiedCaseIds.includes(idNum);
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => toggleCaseId(idNum)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      marginBottom: 6,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primaryLight : "#fff",
                    }}
                  >
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={18}
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        {r.workplaceName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        {`사건번호 ${r.id} · ${r.createdAt.slice(0, 10)}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Section>
        ) : null}

        {verificationMethod === "EVIDENCE_UPLOAD" ? (
          <Section title={`증빙 자료 업로드 (${evidenceItems.length}/${MAX_EVIDENCE_URLS})`}>
            {evidenceItems.map((it, idx) => (
              <View
                key={it.uri}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: radius.sm,
                  padding: 10,
                  marginBottom: 6,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Image
                  source={{ uri: it.uri }}
                  style={{ width: 48, height: 48, borderRadius: 6 }}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text }}>
                    {it.uploading === true
                      ? "업로드 중..."
                      : it.url !== undefined
                        ? "✓ 업로드 완료"
                        : "✗ 실패"}
                  </Text>
                  {it.error !== undefined ? (
                    <Text style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>
                      {it.error}
                    </Text>
                  ) : null}
                </View>
                {it.uploading === true ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Pressable onPress={() => removeEvidence(idx)} hitSlop={6}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable
              key="add-evidence"
              onPress={() => {
                void pickEvidence();
              }}
              disabled={evidenceItems.length >= MAX_EVIDENCE_URLS}
              style={{
                marginTop: 6,
                paddingVertical: 11,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: "#fff",
                alignItems: "center",
                opacity: evidenceItems.length >= MAX_EVIDENCE_URLS ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                + 자료 추가
              </Text>
            </Pressable>
          </Section>
        ) : null}

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={{
            backgroundColor: saving ? "#94A3B8" : colors.primary,
            paddingVertical: 14,
            borderRadius: radius.md,
            alignItems: "center",
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              멘토 등록하기
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function RadioOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 11,
        paddingHorizontal: 12,
        marginBottom: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primaryLight : "#fff",
      }}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={18}
        color={selected ? colors.primary : colors.textSecondary}
      />
      <Text
        style={{
          fontSize: 13,
          fontWeight: selected ? "700" : "500",
          color: selected ? colors.primary : colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
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
