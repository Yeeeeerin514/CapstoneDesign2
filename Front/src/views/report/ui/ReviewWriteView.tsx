import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import {
  useReviewStore,
  INDUSTRY_OPTIONS,
  REGION_OPTIONS,
  DAMAGE_OPTIONS,
  type DamageTypeLabel,
  type ResolutionMethodLabel,
} from "@/entities/review";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { useMentorStore } from "@/features/mentor-match";
import { useReportStore } from "@/features/report-submit";
import {
  calcMentorScore,
  registerMentor,
  type MentorProfile,
  type Industry,
  type DamageType,
  type Region,
  type ResolutionMethod,
  type DamageAmountRange,
} from "@/entities/mentor";
import { calcResolveDays, getAmountRange } from "@/shared/lib/utils";
import type { ReportCase } from "@/entities/report";

interface ReviewWriteViewProps {
  /**
   * 해결된 사건 (auto-fill 소스).
   *   - 있을 때: 메타 필드(업종/지역/피해유형/금액/일수) 자동 채움 + 편집 가능
   *   - 없을 때: "자유 작성 모드" — 모든 필드 사용자 직접 입력
   */
  resolvedCase?: ReportCase;
  onBack: () => void;
}

const MAX_TITLE = 30;
const MAX_CONTENT = 500;
const MAX_TIP = 200;

const AMOUNT_RANGE_OPTIONS = [
  "50만원 미만",
  "50만원대",
  "100만원대",
  "300만원대",
  "500만원 이상",
];

const RESOLUTION_OPTIONS: ResolutionMethodLabel[] = [
  "노동청 진정",
  "합의",
  "지급명령",
  "민사 소송",
  "노무사 상담",
];

// ──────────────────────────────────────
// 후기 화면의 한글 라벨 → 백엔드 멘토 enum 매핑.
// 후기 옵션은 위 *_OPTIONS 고정 집합이라 1:1로 확정 가능(자유 입력 아님).
// 예상치 못한 값이 들어와도 안전하도록 ?? 기본값을 둔다.
// ──────────────────────────────────────
const INDUSTRY_ENUM_MAP: Record<string, Industry> = {
  "카페·음식점": "FOOD_SERVICE",
  "편의점": "CONVENIENCE_RETAIL",
  "배달": "DELIVERY",
  "학원": "EDUCATION",
  "PC방": "SERVICE",
  "기타": "OTHER",
};

const REGION_ENUM_MAP: Record<string, Region> = {
  "서울": "SEOUL",
  "경기": "GYEONGGI",
  "인천": "INCHEON",
  "부산": "BUSAN",
  "대구": "DAEGU",
  "울산": "ULSAN",
  "광주": "GWANGJU",
  "대전": "DAEJEON",
  "세종": "SEJONG",
  "경남": "GYEONGNAM",
  "경북": "GYEONGBUK",
  "전북": "JEONBUK",
  "전남": "JEONNAM",
  "충남": "CHUNGNAM",
  "충북": "CHUNGBUK",
  "제주": "JEJU",
  "기타": "OTHER",
};

const DAMAGE_TYPE_ENUM_MAP: Record<string, DamageType> = {
  "임금(기본급) 미지급": "WAGE_ARREARS",
  "주휴수당 미지급": "WEEKLY_HOLIDAY",
  "연장근로수당 미지급": "OVERTIME_PAY",
  "야간근로수당 미지급": "OVERTIME_PAY",
  "퇴직금 미지급": "SEVERANCE_PAY",
};

const RESOLUTION_METHOD_ENUM_MAP: Record<string, ResolutionMethod> = {
  "노동청 진정": "LABOR_OFFICE_REPORT",
  "합의": "SETTLEMENT",
  "지급명령": "PAYMENT_ORDER",
  "민사 소송": "CIVIL_LAWSUIT",
  "노무사 상담": "LABOR_ATTORNEY",
};

const AMOUNT_RANGE_ENUM_MAP: Record<string, DamageAmountRange> = {
  "50만원 미만": "KRW_100K_500K",
  "50만원대": "KRW_500K_1M",
  "100만원대": "KRW_1M_5M",
  "300만원대": "KRW_1M_5M",
  "500만원 이상": "OVER_5M",
};

/** ReportCase.damageTypes(문자열 배열) → 유효한 DamageTypeLabel 배열로 매핑(중복 제거). */
function mapDamageTypes(raw: string[] | undefined): DamageTypeLabel[] {
  if (raw === undefined) return [];
  const matched = raw.filter((r): r is DamageTypeLabel =>
    DAMAGE_OPTIONS.some((l) => l === r),
  );
  return Array.from(new Set(matched));
}

export function ReviewWriteView({
  resolvedCase,
  onBack,
}: ReviewWriteViewProps): JSX.Element {
  const addReview = useReviewStore((s) => s.addReview);
  const setHasWrittenReview = useReportStore((s) => s.setHasWrittenReview);
  const cases = useReportStore((s) => s.cases);
  const nickname = useAuthStore((s) => s.nickname);
  const userId = useAuthStore((s) => s.userIdString);

  const isFreeMode = resolvedCase === undefined;

  // ── 메타 필드 — resolvedCase가 있으면 prefill, 없으면 빈 값. 사용자 편집 가능.
  const [industry, setIndustry] = useState<string>(
    resolvedCase?.industry ?? "",
  );
  const [region, setRegion] = useState<string>(resolvedCase?.region ?? "");
  const [damageTypes, setDamageTypes] = useState<DamageTypeLabel[]>(
    mapDamageTypes(resolvedCase?.damageTypes),
  );

  const toggleDamageType = (opt: DamageTypeLabel): void => {
    setDamageTypes((prev) =>
      prev.includes(opt) ? prev.filter((d) => d !== opt) : [...prev, opt],
    );
  };
  const [amountRange, setAmountRange] = useState<string>(
    resolvedCase !== undefined
      ? getAmountRange(resolvedCase.calculatedUnpaid ?? 0)
      : "",
  );
  const initialResolveDays = (() => {
    if (resolvedCase === undefined) return "";
    const days = calcResolveDays({
      createdAt: resolvedCase.createdAt,
      resolvedAt: resolvedCase.resolvedAt,
    });
    return days > 0 ? String(days) : "";
  })();
  const [resolveDaysText, setResolveDaysText] =
    useState<string>(initialResolveDays);
  const [resolutionMethod, setResolutionMethod] =
    useState<ResolutionMethodLabel>("노동청 진정");

  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [tipComplaint, setTipComplaint] = useState<string>("");
  const [tipInvestigation, setTipInvestigation] = useState<string>("");
  const [tipNegotiation, setTipNegotiation] = useState<string>("");
  const [registerAsMentor, setRegisterAsMentor] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const resolveDays = parseInt(resolveDaysText, 10);
  const canSubmit =
    trimmedTitle.length > 0 &&
    trimmedContent.length > 0 &&
    industry.length > 0 &&
    region.length > 0 &&
    damageTypes.length > 0 &&
    amountRange.length > 0 &&
    Number.isFinite(resolveDays) &&
    resolveDays > 0;

  /**
   * 백엔드 멘토 등록의 자격 검증용 caseId 수집.
   * report store의 RESOLVED 사건 + (있으면) 현재 resolvedCase 중 백엔드 numeric id만.
   * MyView의 게이트와 동일한 규칙. 클라 id(report-<ts>)는 NaN이라 제외됨.
   */
  const collectVerifiedCaseIds = (): number[] => {
    const ids: number[] = [];
    for (const c of cases) {
      if (c.status === "RESOLVED") {
        const n = Number(c.id);
        if (Number.isFinite(n) && n > 0) ids.push(n);
      }
    }
    if (resolvedCase !== undefined) {
      const n = Number(resolvedCase.id);
      if (Number.isFinite(n) && n > 0 && !ids.includes(n)) ids.push(n);
    }
    return ids;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) {
      Alert.alert(
        "입력 확인",
        "업종·지역·피해 유형·금액·해결 일수·제목·내용을 모두 입력해주세요.",
      );
      return;
    }
    if (submitting) return;

    if (resolvedCase !== undefined) {
      setHasWrittenReview(resolvedCase.id, true);
    }
    addReview({
      authorNickname: nickname,
      authorBadges: registerAsMentor ? ["🛡 인증멘토"] : [],
      industry,
      region,
      damageTypes,
      resolutionMethod,
      unpaidAmountRange: amountRange,
      resolveDays,
      rating,
      title: trimmedTitle,
      content: trimmedContent,
      tips: {
        complaint: tipComplaint.trim(),
        investigation: tipInvestigation.trim(),
        negotiation: tipNegotiation.trim(),
      },
      isMentor: registerAsMentor,
      mentorUserId: registerAsMentor ? userId : null,
    });

    if (!registerAsMentor) {
      Alert.alert("등록 완료", "후기가 등록되었습니다. 감사해요!", [
        { text: "확인", onPress: onBack },
      ]);
      return;
    }

    // 로컬 mock 멘토 store (레거시 추천 화면 호환) — 중복 방지 후 추가.
    const mentorStore = useMentorStore.getState();
    if (mentorStore.getMentorById(userId) === undefined) {
      const baseProfile: Omit<MentorProfile, "score"> = {
        userId,
        nickname,
        isVerified: false,
        wasGroupLeader: false,
        averageRating: rating,
        reviewCount: 1,
        resolvedDays: resolveDays,
        industry,
        damageTypes: [...damageTypes],
        consultingFee: 10000,
        badges: [],
        bio: trimmedTitle,
      };
      mentorStore.addMentor({
        ...baseProfile,
        score: calcMentorScore(baseProfile),
      });
    }

    // 백엔드 멘토 등록 — 해결 경험(RESOLVED 사건)이 있어야 자격 통과.
    // 없으면 정직하게 RESOLVED_CASE를 주장하지 않고 MY탭 정식 등록(증빙)으로 안내.
    const hasResolvedExperience =
      resolvedCase !== undefined || cases.some((c) => c.status === "RESOLVED");
    if (!hasResolvedExperience) {
      Alert.alert(
        "후기 등록 완료",
        "후기가 등록되었습니다. 멘토로 매칭되려면 MY 탭에서 해결한 사건 또는 증빙 자료로 멘토 등록을 완료해주세요.",
        [{ text: "확인", onPress: onBack }],
      );
      return;
    }

    const verifiedCaseIds = collectVerifiedCaseIds();
    setSubmitting(true);
    try {
      // 후기 화면에 없는 항목(고용형태/사업장규모)은 정식 등록 화면과 동일한 기본값.
      await registerMentor({
        nickname,
        industry: INDUSTRY_ENUM_MAP[industry] ?? "OTHER",
        damageTypes: Array.from(
          new Set(damageTypes.map((d) => DAMAGE_TYPE_ENUM_MAP[d] ?? "OTHER")),
        ),
        employmentType: "OTHER",
        businessSize: "UNKNOWN",
        region: REGION_ENUM_MAP[region] ?? "OTHER",
        resolutionMethods: [RESOLUTION_METHOD_ENUM_MAP[resolutionMethod] ?? "OTHER"],
        resolutionDays: Number.isFinite(resolveDays) ? resolveDays : 0,
        damageAmountRange: AMOUNT_RANGE_ENUM_MAP[amountRange] ?? "UNDER_100K",
        bio: trimmedContent.slice(0, 200),
        capacity: 3,
        consultingFee: 10000,
        verificationMethod: "RESOLVED_CASE",
        verifiedCaseIds: verifiedCaseIds.length > 0 ? verifiedCaseIds : [0],
      });
      Alert.alert(
        "등록 완료",
        "후기가 등록되었습니다. 멘토 등록도 함께 완료되었어요!",
        [{ text: "확인", onPress: onBack }],
      );
    } catch {
      Alert.alert(
        "후기 등록 완료",
        "후기는 등록되었지만 멘토 등록 중 문제가 발생했어요. MY 탭에서 다시 시도해주세요.",
        [{ text: "확인", onPress: onBack }],
      );
    } finally {
      setSubmitting(false);
    }
  };

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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            {isFreeMode ? "내 해결 경험 공유하기" : "후기 쓰기"}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            {isFreeMode
              ? "다른 분들에게 도움이 될 정보를 남겨주세요"
              : `${resolvedCase?.workplaceName ?? ""} 해결 경험`}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 0,
          paddingBottom: 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {isFreeMode ? (
          <View
            style={{
              backgroundColor: "#EBF3FF",
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#B5D4F4",
              flexDirection: "row",
              gap: 6,
              alignItems: "flex-start",
            }}
          >
            <Ionicons
              name="information-circle"
              size={14}
              color="#185FA5"
              style={{ marginTop: 1 }}
            />
            <Text
              style={{ flex: 1, fontSize: 12, color: "#185FA5", lineHeight: 18 }}
            >
              자유 작성 모드 — 우리 앱에서 신고하지 않은 경험도 공유할 수
              있어요. 모든 항목을 직접 입력해주세요.
            </Text>
          </View>
        ) : null}

        <SectionCard title="사건 정보">
          <RadioGroup
            label="업종"
            value={industry}
            options={INDUSTRY_OPTIONS}
            onChange={setIndustry}
          />
          <RadioGroup
            label="지역"
            value={region}
            options={REGION_OPTIONS}
            onChange={setRegion}
          />
          <CheckGroup
            label="피해 유형 (중복 선택 가능)"
            values={damageTypes}
            options={DAMAGE_OPTIONS}
            onToggle={(v) => toggleDamageType(v as DamageTypeLabel)}
          />
          <RadioGroup
            label="미지급 금액"
            value={amountRange}
            options={AMOUNT_RANGE_OPTIONS}
            onChange={setAmountRange}
          />
          <NumberInputRow
            label="해결까지 걸린 일수"
            value={resolveDaysText}
            onChange={setResolveDaysText}
            placeholder="예: 18"
            suffix="일"
          />
          <RadioGroup
            label="해결 방법"
            value={resolutionMethod}
            options={RESOLUTION_OPTIONS}
            onChange={(v) => setResolutionMethod(v as ResolutionMethodLabel)}
          />
        </SectionCard>

        <SectionCard title="해결 만족도">
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}>
                <Ionicons
                  name={n <= rating ? "star" : "star-outline"}
                  size={32}
                  color={n <= rating ? "#F59E0B" : "#CBD5E1"}
                />
              </Pressable>
            ))}
            <View style={{ flex: 1 }} />
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: "#F59E0B" }}
            >
              {rating.toFixed(1)}
            </Text>
          </View>
        </SectionCard>

        <LabeledTextInput
          label="제목"
          value={title}
          onChange={(v) => setTitle(v.slice(0, MAX_TITLE))}
          placeholder="예: 2주만에 해결했어요, 진정서 이렇게 쓰세요"
          counter={`${title.length} / ${MAX_TITLE}`}
        />

        <LabeledTextInput
          label="상황 요약"
          value={content}
          onChange={(v) => setContent(v.slice(0, MAX_CONTENT))}
          placeholder="어떤 일이 있었고 어떻게 해결했는지 자유롭게 써주세요"
          counter={`${content.length} / ${MAX_CONTENT}`}
          multiline
          minHeight={120}
        />

        {/* 노하우 — 모두 선택 */}
        <SectionCard title="노하우 (선택)">
          <Text
            style={{
              fontSize: 11,
              color: "#94A3B8",
              marginBottom: 10,
              lineHeight: 16,
            }}
          >
            후배에게 해주고 싶은 말이 있다면 적어주세요. 빈 칸은 카드에 표시되지 않아요.
          </Text>
          <LabeledTextInput
            label="진정서 작성 팁"
            value={tipComplaint}
            onChange={(v) => setTipComplaint(v.slice(0, MAX_TIP))}
            placeholder="예: 통장 내역 첨부 강력 추천"
            counter={`${tipComplaint.length} / ${MAX_TIP}`}
            multiline
            minHeight={64}
            inline
          />
          <LabeledTextInput
            label="출석조사 팁"
            value={tipInvestigation}
            onChange={(v) => setTipInvestigation(v.slice(0, MAX_TIP))}
            placeholder="예: 사장과 대질조사 거부 권리 사용 가능"
            counter={`${tipInvestigation.length} / ${MAX_TIP}`}
            multiline
            minHeight={64}
            inline
          />
          <LabeledTextInput
            label="사업주 협상 팁"
            value={tipNegotiation}
            onChange={(v) => setTipNegotiation(v.slice(0, MAX_TIP))}
            placeholder="예: 형사 고소 언급하면 태도 변함"
            counter={`${tipNegotiation.length} / ${MAX_TIP}`}
            multiline
            minHeight={64}
            inline
          />
        </SectionCard>

        {/* 멘토 등록 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Switch
              value={registerAsMentor}
              onValueChange={setRegisterAsMentor}
              trackColor={{ false: "#CBD5E1", true: "#3182F6" }}
              thumbColor="#FFFFFF"
            />
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
            >
              멘토로 등록하기
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: "#64748B", lineHeight: 17 }}>
            해결 경험을 바탕으로 다른 분들에게 1:1 상담을 제공할 수 있어요.
            (상담료 ₩10,000)
          </Text>
        </View>

        <Pressable
          onPress={() => void handleSubmit()}
          disabled={!canSubmit || submitting}
          style={{
            backgroundColor: canSubmit && !submitting ? "#3182F6" : "#CBD5E1",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 4,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
              후기 등록하기
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────
// 공통 폼 컴포넌트
// ──────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function RadioGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 12,
          color: "#475569",
          fontWeight: "600",
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? "#3182F6" : "#F8FAFC",
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
    </View>
  );
}

/** 다중 선택 칩 그룹 — 피해 유형 중복 선택용. */
function CheckGroup({
  label,
  values,
  options,
  onToggle,
}: {
  label: string;
  values: readonly string[];
  options: readonly string[];
  onToggle: (v: string) => void;
}): JSX.Element {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 12,
          color: "#475569",
          fontWeight: "600",
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => onToggle(opt)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? "#3182F6" : "#F8FAFC",
                borderWidth: 1,
                borderColor: active ? "#3182F6" : "#E2E8F0",
              }}
            >
              {active ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              ) : null}
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
    </View>
  );
}

function NumberInputRow({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  suffix: string;
}): JSX.Element {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 12,
          color: "#475569",
          fontWeight: "600",
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#F8FAFC",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          paddingHorizontal: 12,
        }}
      >
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={{
            flex: 1,
            fontSize: 14,
            color: "#0F172A",
            paddingVertical: 10,
          }}
        />
        <Text style={{ fontSize: 13, color: "#64748B" }}>{suffix}</Text>
      </View>
    </View>
  );
}

interface LabeledTextInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  counter?: string;
  multiline?: boolean;
  minHeight?: number;
  /** SectionCard 안에 들어갈 때 카드 wrap 생략. */
  inline?: boolean;
}

function LabeledTextInput({
  label,
  value,
  onChange,
  placeholder,
  counter,
  multiline,
  minHeight,
  inline,
}: LabeledTextInputProps): JSX.Element {
  const body = (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text style={{ fontSize: 12, color: "#475569", fontWeight: "600" }}>
          {label}
        </Text>
        {counter !== undefined ? (
          <Text style={{ fontSize: 11, color: "#94A3B8" }}>{counter}</Text>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline === true}
        textAlignVertical={multiline === true ? "top" : "auto"}
        style={{
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: "#0F172A",
          minHeight: minHeight,
        }}
      />
    </>
  );
  if (inline === true) {
    return <View style={{ marginBottom: 10 }}>{body}</View>;
  }
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {body}
    </View>
  );
}
