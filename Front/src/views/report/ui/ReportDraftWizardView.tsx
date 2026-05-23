import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ScreenHeader } from "@/shared/ui";
import { useReportStore } from "@/features/report-submit";
import type { ReportCase } from "@/entities/report";
import {
  buildComplaintHtml,
  type NegotiationStatus as DraftNegotiation,
  type ReportDraft,
} from "@/features/report-submit/lib/buildComplaintHtml";

interface ReportDraftWizardViewProps {
  reportCase: ReportCase;
  onBack: () => void;
  /** 노동청 제출 완료 시 호출 — 부모가 SubmissionResultView로 전환. */
  onSubmitted?: () => void;
}

type StepKey =
  | "damage-types"
  | "period"
  | "amount"
  | "negotiation"
  | "preview";

const STEPS: StepKey[] = [
  "damage-types",
  "period",
  "amount",
  "negotiation",
  "preview",
];

const DAMAGE_OPTIONS = [
  { id: "base", label: "임금(기본급) 미지급" },
  { id: "weekly", label: "주휴수당 미지급" },
  { id: "overtime", label: "연장근로수당 미지급" },
  { id: "night", label: "야간근로수당 미지급" },
  { id: "severance", label: "퇴직금 미지급" },
] as const;

type DamageId = (typeof DAMAGE_OPTIONS)[number]["id"];

type NegotiationStatus = "refused" | "not-tried" | "no-response";

const NEGOTIATION_OPTIONS: Array<{
  id: NegotiationStatus;
  label: string;
  draftText: string;
}> = [
  {
    id: "refused",
    label: "협의 요청했지만 거부당했어요",
    draftText:
      "진정인은 사업주에게 임금 지급을 요청하였으나 사업주가 이를 거부하였습니다.",
  },
  {
    id: "not-tried",
    label: "아직 협의 시도를 안 했어요",
    draftText:
      "진정인은 사업주에게 아직 임금 지급 요청을 하지 않았습니다.",
  },
  {
    id: "no-response",
    label: "연락이 안 돼요",
    draftText:
      "진정인은 사업주에게 연락을 시도하였으나 응답이 없었습니다.",
  },
];

interface AmountBreakdown {
  base: number;
  weekly: number;
  overtime: number;
  night: number;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function diffDays(start: Date, end: Date): number {
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

export function ReportDraftWizardView({
  reportCase,
  onBack,
  onSubmitted,
}: ReportDraftWizardViewProps): JSX.Element {
  const [stepIdx, setStepIdx] = useState(0);

  // Step 1
  const [damageTypes, setDamageTypes] = useState<DamageId[]>([
    "base",
    "weekly",
  ]);

  // Step 2 — 피해 기간 (사건 생성 시각 ~ 오늘을 기본값으로)
  const [periodStart, setPeriodStart] = useState<Date>(
    new Date(reportCase.createdAt),
  );
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 3 — 자동 산정값 (PoC: calculatedUnpaid 우선, 없으면 wageOwed, 둘 다 없으면 0)
  const baseAmount =
    reportCase.calculatedUnpaid ?? reportCase.calculatedWageOwed ?? 0;
  const autoBreakdown = useMemo<AmountBreakdown>(() => {
    const total = baseAmount;
    return {
      base: Math.round(total * 0.6),
      weekly: Math.round(total * 0.2),
      overtime: Math.round(total * 0.15),
      night: Math.round(total * 0.05),
    };
  }, [baseAmount]);
  const [manualEdit, setManualEdit] = useState(false);
  const [breakdown, setBreakdown] = useState<AmountBreakdown>(autoBreakdown);
  const total =
    breakdown.base + breakdown.weekly + breakdown.overtime + breakdown.night;

  // Step 4
  const [negotiation, setNegotiation] = useState<NegotiationStatus>("refused");

  const currentStep = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const canNext = (() => {
    if (currentStep === "damage-types") return damageTypes.length > 0;
    return true;
  })();

  const toggleDamage = (id: DamageId): void => {
    setDamageTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handlePrev = (): void => {
    if (stepIdx === 0) {
      onBack();
      return;
    }
    setStepIdx(stepIdx - 1);
  };

  const handleNext = (): void => {
    if (isLast) return;
    setStepIdx(stepIdx + 1);
  };

  const buildDraft = (): ReportDraft => ({
    damageTypes,
    workPeriod: {
      start: formatDate(periodStart),
      end: formatDate(periodEnd),
    },
    unpaidBreakdown: breakdown,
    unpaidAmount: total,
    employerNegotiation: negotiation as DraftNegotiation,
  });

  /**
   * 미리보기 + 직접 수정용 — 구조화된 본문을 단일 plain text로 직렬화.
   * 사용자가 "직접 수정하기" 누르면 이 텍스트를 TextInput에 채워서 편집 시작.
   */
  const buildDefaultBodyText = (): string => {
    const today = formatDate(new Date());
    const evidenceLines: string[] = [
      `  - 근로계약서: ${reportCase.evidence.contracts}건`,
      `  - 출퇴근 기록: ${reportCase.evidence.workLogs}건`,
    ];
    if (reportCase.evidence.paystubs > 0) {
      evidenceLines.push(
        `  - 급여 명세서: ${reportCase.evidence.paystubs}건`,
      );
    }
    if (reportCase.evidence.bankRecords > 0) {
      evidenceLines.push(
        `  - 통장 내역: ${reportCase.evidence.bankRecords}건`,
      );
    }
    const negText =
      NEGOTIATION_OPTIONS.find((o) => o.id === negotiation)?.draftText ?? "";

    return [
      `진정인:    [본인 성함] ([연락처])`,
      `피진정인:  ${reportCase.workplaceName} (사업주: [사업주명])`,
      `           주소: [사업장 주소]`,
      ``,
      `[진정 취지]`,
      `  진정인은 피진정인이 운영하는 사업장에서`,
      `  ${formatDate(periodStart)}부터 ${formatDate(periodEnd)}까지 근로하였으며,`,
      `  근로기준법 제43조에 따라 지급받아야 할 임금`,
      `  총 ₩${total.toLocaleString()}원을 지급받지 못하여 진정합니다.`,
      ``,
      `[진정 사유]`,
      `  1. 미지급 항목 및 금액`,
      `     - 기본 임금: ₩${breakdown.base.toLocaleString()}`,
      `     - 주휴수당: ₩${breakdown.weekly.toLocaleString()}  (근로기준법 제55조)`,
      `     - 연장근로수당: ₩${breakdown.overtime.toLocaleString()}  (근로기준법 제56조)`,
      `     - 야간근로수당: ₩${breakdown.night.toLocaleString()}  (근로기준법 제56조)`,
      `     - 합계: ₩${total.toLocaleString()}`,
      `  2. 협의 시도 여부`,
      `     ${negText}`,
      ``,
      `[증거 자료]`,
      ...evidenceLines,
      ``,
      `위와 같이 진정합니다.`,
      `${today}`,
      `진정인: [본인 성함] (서명)`,
      ``,
      `[관할 고용노동청] 귀하`,
    ].join("\n");
  };

  /** 사용자가 직접 편집한 본문. null이면 구조화 미리보기 사용. */
  const [customBodyText, setCustomBodyText] = useState<string | null>(null);

  const generatePdfUri = async (): Promise<string> => {
    const html = buildComplaintHtml(
      buildDraft(),
      reportCase,
      customBodyText ?? undefined,
    );
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return uri;
  };

  const handleSavePdf = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const uri = await generatePdfUri();
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("저장됨", `PDF가 생성되었습니다.\n${uri}`);
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "진정서 저장",
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      console.error("PDF 생성 실패:", error);
      Alert.alert("오류", "PDF 저장에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const uri = await generatePdfUri();
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("안내", "이 기기에서 공유 기능을 사용할 수 없습니다.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "진정서 공유",
      });
    } catch (error) {
      console.error("PDF 공유 실패:", error);
      Alert.alert("오류", "공유에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const completeStepAction = useReportStore((s) => s.completeStep);
  const setCurrentStepAction = useReportStore((s) => s.setCurrentStep);
  const updateCaseStatus = useReportStore((s) => s.updateCaseStatus);
  const setSubmittedAt = useReportStore((s) => s.setSubmittedAt);

  // 고용24 외부 브라우저 흐름 — 직접 URL 오픈 + AppState 복귀 감지로 확인 배너 노출.
  const GOYO24_URL = "https://labor.moel.go.kr/minwon/minwonProcess.do";
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [browserOpened, setBrowserOpened] = useState(false);
  const [returnedFromBrowser, setReturnedFromBrowser] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      // background/inactive → active 전환 + 브라우저로 보낸 적이 있으면 복귀 처리
      if (
        (prev === "background" || prev === "inactive") &&
        next === "active" &&
        browserOpened
      ) {
        setReturnedFromBrowser(true);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [browserOpened]);

  const handleSubmitToMinistry = async (): Promise<void> => {
    const canOpen = await Linking.canOpenURL(GOYO24_URL);
    if (canOpen) {
      setBrowserOpened(true);
      await Linking.openURL(GOYO24_URL);
    } else {
      Alert.alert(
        "오류",
        "브라우저를 열 수 없습니다. 고용24(labor.moel.go.kr)에 직접 접속해주세요.",
      );
    }
  };

  const handleConfirmSubmitted = (): void => {
    completeStepAction(reportCase.id, "submission");
    setCurrentStepAction(reportCase.id, "investigation");
    updateCaseStatus(reportCase.id, "inspecting");
    setSubmittedAt(reportCase.id, new Date().toISOString());
    setReturnedFromBrowser(false);
    setBrowserOpened(false);
    if (onSubmitted !== undefined) onSubmitted();
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
        <Pressable onPress={handlePrev}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          진정서 작성
        </Text>
      </View>

      {/* Step indicator */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: "#FFFFFF",
          gap: 6,
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
        {STEPS.map((_, i) => {
          const filled = i <= stepIdx;
          return (
            <View
              key={i}
              style={{
                width: i === stepIdx ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: filled ? "#3182F6" : "#E2E8F0",
              }}
            />
          );
        })}
        <Text
          style={{
            fontSize: 12,
            color: "#475569",
            marginLeft: 8,
            fontWeight: "600",
          }}
        >
          {`${stepIdx + 1} / ${STEPS.length}`}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100,
        }}
      >
        {currentStep === "damage-types" ? (
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 6,
              }}
            >
              피해 유형을 선택하세요
            </Text>
            <Text
              style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}
            >
              해당하는 항목을 모두 선택해주세요 (다중 선택)
            </Text>
            {DAMAGE_OPTIONS.map((opt) => {
              const checked = damageTypes.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => toggleDamage(opt.id)}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderWidth: checked ? 1.5 : 1,
                    borderColor: checked ? "#3182F6" : "#E2E8F0",
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: checked ? "#3182F6" : "#CBD5E1",
                      backgroundColor: checked ? "#3182F6" : "#FFFFFF",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {checked ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#0F172A",
                      fontWeight: checked ? "600" : "500",
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {currentStep === "period" ? (
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 6,
              }}
            >
              피해 기간을 확인하세요
            </Text>
            <Text
              style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}
            >
              자동 입력된 기간을 확인하고 필요 시 수정하세요
            </Text>

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text
                style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}
              >
                근무 시작일 ~ 종료일
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 4,
                }}
              >
                {`${formatDate(periodStart)} ~ ${formatDate(periodEnd)}`}
              </Text>
              <Text style={{ fontSize: 13, color: "#3182F6" }}>
                {`총 ${diffDays(periodStart, periodEnd)}일`}
              </Text>

              <View
                style={{ flexDirection: "row", gap: 8, marginTop: 14 }}
              >
                <Pressable
                  onPress={() => setShowStartPicker(true)}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    backgroundColor: "#F8FAFC",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 10, color: "#94A3B8", marginBottom: 2 }}
                  >
                    시작일
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#0F172A",
                      fontWeight: "600",
                    }}
                  >
                    {periodStart.toLocaleDateString("ko-KR")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowEndPicker(true)}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    backgroundColor: "#F8FAFC",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 10, color: "#94A3B8", marginBottom: 2 }}
                  >
                    종료일
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#0F172A",
                      fontWeight: "600",
                    }}
                  >
                    {periodEnd.toLocaleDateString("ko-KR")}
                  </Text>
                </Pressable>
              </View>

              {showStartPicker ? (
                <DateTimePicker
                  value={periodStart}
                  mode="date"
                  display="spinner"
                  locale="ko-KR"
                  maximumDate={periodEnd}
                  onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                    setShowStartPicker(false);
                    if (selected !== undefined) setPeriodStart(selected);
                  }}
                />
              ) : null}
              {showEndPicker ? (
                <DateTimePicker
                  value={periodEnd}
                  mode="date"
                  display="spinner"
                  locale="ko-KR"
                  minimumDate={periodStart}
                  maximumDate={new Date()}
                  onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                    setShowEndPicker(false);
                    if (selected !== undefined) setPeriodEnd(selected);
                  }}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {currentStep === "amount" ? (
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 6,
              }}
            >
              미지급 금액을 확인하세요
            </Text>
            <Text
              style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}
            >
              자동 계산된 금액을 확인하고 필요 시 수정하세요
            </Text>

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              {[
                { label: "기본 임금", key: "base" as const },
                { label: "주휴수당", key: "weekly" as const },
                { label: "연장수당", key: "overtime" as const },
                { label: "야간수당", key: "night" as const },
              ].map((row, idx, arr) => (
                <View
                  key={row.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                    borderBottomColor: "#F1F5F9",
                  }}
                >
                  <Text
                    style={{ fontSize: 13, color: "#475569", flex: 1 }}
                  >
                    {row.label}
                  </Text>
                  {manualEdit ? (
                    <TextInput
                      value={String(breakdown[row.key])}
                      onChangeText={(v) => {
                        const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
                        setBreakdown({
                          ...breakdown,
                          [row.key]: Number.isFinite(n) ? n : 0,
                        });
                      }}
                      keyboardType="number-pad"
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#0F172A",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        minWidth: 120,
                        textAlign: "right",
                      }}
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#0F172A",
                      }}
                    >
                      {`₩${breakdown[row.key].toLocaleString()}`}
                    </Text>
                  )}
                </View>
              ))}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingTop: 12,
                  marginTop: 6,
                  borderTopWidth: 1,
                  borderTopColor: "#E2E8F0",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: "#0F172A",
                    fontWeight: "700",
                    flex: 1,
                  }}
                >
                  합계
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#DC2626",
                  }}
                >
                  {`₩${total.toLocaleString()}`}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                if (manualEdit) {
                  // 자동값으로 되돌리기
                  setBreakdown(autoBreakdown);
                }
                setManualEdit(!manualEdit);
              }}
              style={{
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: manualEdit ? "#FEF2F2" : "#FFFFFF",
                borderWidth: 1,
                borderColor: manualEdit ? "#FCA5A5" : "#E2E8F0",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: manualEdit ? "#DC2626" : "#475569",
                }}
              >
                {manualEdit ? "자동값으로 되돌리기" : "수동으로 수정"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {currentStep === "negotiation" ? (
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 6,
              }}
            >
              사업주와 협의 시도하셨나요?
            </Text>
            <Text
              style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}
            >
              선택에 따라 진정서 문구가 달라집니다
            </Text>
            {NEGOTIATION_OPTIONS.map((opt) => {
              const checked = negotiation === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setNegotiation(opt.id)}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderWidth: checked ? 1.5 : 1,
                    borderColor: checked ? "#3182F6" : "#E2E8F0",
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: checked ? "#3182F6" : "#CBD5E1",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {checked ? (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#3182F6",
                        }}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#0F172A",
                      fontWeight: checked ? "600" : "500",
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {currentStep === "preview" ? (
          <ComplaintPreview
            reportCase={reportCase}
            periodStart={periodStart}
            periodEnd={periodEnd}
            breakdown={breakdown}
            total={total}
            negotiationText={
              NEGOTIATION_OPTIONS.find((o) => o.id === negotiation)
                ?.draftText ?? ""
            }
            onSavePdf={handleSavePdf}
            onShare={handleShare}
            onSubmit={() => {
              void handleSubmitToMinistry();
            }}
            returnedFromBrowser={returnedFromBrowser}
            onConfirmSubmitted={handleConfirmSubmitted}
            onNotYet={() => setReturnedFromBrowser(false)}
            customBodyText={customBodyText}
            onEnterEdit={() => setCustomBodyText(buildDefaultBodyText())}
            onSaveEdit={(text) => setCustomBodyText(text)}
            onResetEdit={() => setCustomBodyText(null)}
          />
        ) : null}
      </ScrollView>

      {/* 하단 네비게이션 (preview 단계에서는 숨김) */}
      {!isLast ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E2E8F0",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Pressable
            onPress={handlePrev}
            style={{
              flex: 1,
              paddingVertical: 14,
              backgroundColor: "#F8FAFC",
              borderRadius: 10,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Text
              style={{ color: "#475569", fontSize: 14, fontWeight: "500" }}
            >
              {stepIdx === 0 ? "취소" : "이전"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNext}
            disabled={!canNext}
            style={{
              flex: 2,
              paddingVertical: 14,
              backgroundColor: canNext ? "#3182F6" : "#94A3B8",
              borderRadius: 10,
              alignItems: "center",
              opacity: canNext ? 1 : 0.6,
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
            >
              다음
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* PDF 생성/공유 중 오버레이 */}
      {isGenerating ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 24,
              alignItems: "center",
              minWidth: 180,
            }}
          >
            <ActivityIndicator size="large" color="#3182F6" />
            <Text
              style={{
                fontSize: 13,
                color: "#475569",
                marginTop: 12,
              }}
            >
              PDF 생성 중...
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────
// 진정서 미리보기 + 액션 버튼
// ──────────────────────────────────────────

interface PreviewProps {
  reportCase: ReportCase;
  periodStart: Date;
  periodEnd: Date;
  breakdown: AmountBreakdown;
  total: number;
  negotiationText: string;
  onSavePdf: () => void;
  onShare: () => void;
  onSubmit: () => void;
  /** 외부 브라우저에서 돌아온 직후 — "제출하셨나요?" 확인 배너 노출 트리거. */
  returnedFromBrowser: boolean;
  /** "제출 완료했어요 ✓" — 상위가 상태 전환 + 결과 화면으로 진입. */
  onConfirmSubmitted: () => void;
  /** "아직 안 했어요" — 배너만 닫고 다시 제출 가능. */
  onNotYet: () => void;
  /** 사용자가 직접 편집한 본문 — null이면 구조화 미리보기 사용. */
  customBodyText: string | null;
  /** "✏️ 직접 수정하기" — 상위가 buildDefaultBodyText 결과를 customBodyText에 채워 편집 모드로. */
  onEnterEdit: () => void;
  /** "수정 완료" — 편집한 텍스트 저장. */
  onSaveEdit: (text: string) => void;
  /** "원래대로" — customBodyText를 null로 되돌려 구조화 렌더로 복귀. */
  onResetEdit: () => void;
}

function ComplaintPreview({
  reportCase,
  periodStart,
  periodEnd,
  breakdown,
  total,
  negotiationText,
  onSavePdf,
  onShare,
  onSubmit,
  returnedFromBrowser,
  onConfirmSubmitted,
  onNotYet,
  customBodyText,
  onEnterEdit,
  onSaveEdit,
  onResetEdit,
}: PreviewProps): JSX.Element {
  const today = formatDate(new Date());
  // 편집 모드 — customBodyText가 null이 아니지만 사용자가 아직 [수정 완료]를 안 누른 경우.
  // draftText는 TextInput value, 저장 시 onSaveEdit으로 상위에 통보.
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState("");

  const handleEnterEdit = (): void => {
    onEnterEdit(); // 상위가 default body로 customBodyText 채움
    setDraftText(customBodyText ?? "");
    setIsEditing(true);
  };

  // customBodyText가 채워졌는데 draftText 미초기화 시 동기화 (handleEnterEdit 직후 useEffect 대신)
  if (isEditing && draftText.length === 0 && customBodyText !== null) {
    setDraftText(customBodyText);
  }

  return (
    <View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 6,
        }}
      >
        진정서 미리보기
      </Text>
      <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
        아래 내용을 확인하고 저장하거나 제출하세요
      </Text>

      {/* 미리보기 위 액션 줄 — 편집 / 다시 자동 생성 토글 */}
      {!isEditing ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {customBodyText !== null ? (
            <Pressable
              onPress={onResetEdit}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: "#F1F5F9",
              }}
            >
              <Text
                style={{ fontSize: 12, color: "#475569", fontWeight: "600" }}
              >
                자동 생성으로 되돌리기
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleEnterEdit}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: "#3182F6",
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Ionicons name="create-outline" size={12} color="#FFFFFF" />
            <Text
              style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "600" }}
            >
              {customBodyText !== null ? "다시 수정하기" : "직접 수정하기"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#0F172A",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          진　정　서
        </Text>

        {/* 편집 모드 — TextInput multiline */}
        {isEditing ? (
          <>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              multiline
              textAlignVertical="top"
              style={{
                ...previewLineStyle,
                minHeight: 320,
                borderWidth: 1,
                borderColor: "#3182F6",
                borderRadius: 8,
                padding: 12,
                backgroundColor: "#F8FAFC",
              }}
            />
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 12,
              }}
            >
              <Pressable
                onPress={() => {
                  // 편집 취소 — customBodyText는 onEnterEdit가 채웠지만 사용자가 취소했으니 되돌림
                  onResetEdit();
                  setDraftText("");
                  setIsEditing(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Text
                  style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}
                >
                  취소
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onSaveEdit(draftText);
                  setIsEditing(false);
                }}
                style={{
                  flex: 2,
                  paddingVertical: 11,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: "#3182F6",
                }}
              >
                <Text
                  style={{ fontSize: 13, color: "#FFFFFF", fontWeight: "600" }}
                >
                  수정 완료
                </Text>
              </Pressable>
            </View>
          </>
        ) : customBodyText !== null ? (
          // 저장된 사용자 편집본 — 줄바꿈 유지 plain 렌더
          <Text style={previewLineStyle}>{customBodyText}</Text>
        ) : (
          /* eslint-disable-next-line @typescript-eslint/no-unused-expressions */
          null
        )}

        {/* 기본 구조화 미리보기 — customBodyText가 null이고 편집 중도 아닐 때만 */}
        {!isEditing && customBodyText === null ? (
          <>
        <Text style={previewLineStyle}>
          진정인:    [본인 성함] ([연락처])
        </Text>
        <Text style={previewLineStyle}>
          {`피진정인:  ${reportCase.workplaceName} (사업주: [사업주명])`}
        </Text>
        <Text style={previewLineStyle}>
          {`           주소: [사업장 주소]`}
        </Text>

        <Text style={previewSectionStyle}>진정 취지</Text>
        <Text style={previewLineStyle}>
          {`  진정인은 피진정인이 운영하는 사업장에서`}
        </Text>
        <Text style={previewLineStyle}>
          {`  ${formatDate(periodStart)}부터 ${formatDate(periodEnd)}까지 근로하였으며,`}
        </Text>
        <Text style={previewLineStyle}>
          {`  근로기준법 제43조에 따라 지급받아야 할 임금`}
        </Text>
        <Text style={previewLineStyle}>
          {`  총 ₩${total.toLocaleString()}원을 지급받지 못하여 진정합니다.`}
        </Text>

        <Text style={previewSectionStyle}>진정 사유</Text>
        <Text style={previewLineStyle}>
          {`  1. 미지급 항목 및 금액`}
        </Text>
        <Text style={previewLineStyle}>
          {`     - 기본 임금: ₩${breakdown.base.toLocaleString()}`}
        </Text>
        <Text style={previewLineStyle}>
          {`     - 주휴수당: ₩${breakdown.weekly.toLocaleString()}  (근로기준법 제55조)`}
        </Text>
        <Text style={previewLineStyle}>
          {`     - 연장근로수당: ₩${breakdown.overtime.toLocaleString()}  (근로기준법 제56조)`}
        </Text>
        <Text style={previewLineStyle}>
          {`     - 야간근로수당: ₩${breakdown.night.toLocaleString()}  (근로기준법 제56조)`}
        </Text>
        <Text style={previewLineStyle}>
          {`     - 합계: ₩${total.toLocaleString()}`}
        </Text>
        <Text style={previewLineStyle}>
          {`  2. 협의 시도 여부`}
        </Text>
        <Text style={previewLineStyle}>
          {`     ${negotiationText}`}
        </Text>

        <Text style={previewSectionStyle}>증거 자료</Text>
        <Text style={previewLineStyle}>
          {`  - 근로계약서: ${reportCase.evidence.contracts}건`}
        </Text>
        <Text style={previewLineStyle}>
          {`  - 출퇴근 기록: ${reportCase.evidence.workLogs}건`}
        </Text>
        {reportCase.evidence.paystubs > 0 ? (
          <Text style={previewLineStyle}>
            {`  - 급여 명세서: ${reportCase.evidence.paystubs}건`}
          </Text>
        ) : null}
        {reportCase.evidence.bankRecords > 0 ? (
          <Text style={previewLineStyle}>
            {`  - 통장 내역: ${reportCase.evidence.bankRecords}건`}
          </Text>
        ) : null}

        <Text
          style={{
            ...previewLineStyle,
            marginTop: 14,
          }}
        >
          위와 같이 진정합니다.
        </Text>
        <Text
          style={{
            ...previewLineStyle,
            textAlign: "right",
            marginTop: 16,
          }}
        >
          {today}
        </Text>
        <Text
          style={{
            ...previewLineStyle,
            textAlign: "right",
            marginBottom: 14,
          }}
        >
          진정인: [본인 성함] (서명)
        </Text>

        <Text
          style={{
            ...previewLineStyle,
            textAlign: "center",
            color: "#475569",
            marginTop: 4,
          }}
        >
          [관할 고용노동청] 귀하
        </Text>
          </>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <Pressable
          onPress={onSavePdf}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            flexDirection: "row",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <Ionicons name="download-outline" size={14} color="#475569" />
          <Text
            style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}
          >
            PDF로 저장
          </Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            flexDirection: "row",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <Ionicons name="share-outline" size={14} color="#475569" />
          <Text
            style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}
          >
            공유하기
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onSubmit}
        style={{
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: "center",
          backgroundColor: "#3182F6",
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Ionicons name="open-outline" size={14} color="#FFFFFF" />
        <Text
          style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
        >
          노동청에 제출하기 (고용24)
        </Text>
      </Pressable>

      {/* 앱 복귀 후 — "제출하셨나요?" 확인 배너 */}
      {returnedFromBrowser ? (
        <View
          style={{
            backgroundColor: "#EBF3FF",
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: "#B5D4F4",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#185FA5",
              marginBottom: 6,
            }}
          >
            고용24에서 제출하셨나요?
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#444444",
              lineHeight: 20,
              marginBottom: 12,
            }}
          >
            제출을 완료하셨다면 아래 버튼을 눌러주세요. 앱에서 다음 단계를
            안내해드립니다.
          </Text>
          <Pressable
            onPress={onConfirmSubmitted}
            style={{
              backgroundColor: "#1A5FAF",
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
            >
              ✅ 제출 완료했어요
            </Text>
          </Pressable>
          <Pressable
            onPress={onNotYet}
            style={{ paddingVertical: 10, alignItems: "center" }}
          >
            <Text style={{ color: "#888888", fontSize: 13 }}>
              아직 안 했어요
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const previewLineStyle = {
  fontSize: 13,
  color: "#0F172A",
  lineHeight: 22,
} as const;

const previewSectionStyle = {
  fontSize: 14,
  fontWeight: "700" as const,
  color: "#0F172A",
  marginTop: 14,
  marginBottom: 6,
};
