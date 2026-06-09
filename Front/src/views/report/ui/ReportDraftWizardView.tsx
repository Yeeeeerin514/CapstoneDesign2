import { useEffect, useRef, useState } from "react";
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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ScreenHeader } from "@/shared/ui";
import { useReportStore } from "@/features/report-submit";
import type {
  ApplicantInfo,
  DamageTypeEnum,
  ReportCase,
} from "@/entities/report";
import { generateReportDraft } from "@/entities/report";
import {
  buildComplaintHtml,
  type NegotiationStatus,
} from "@/features/report-submit/lib/buildComplaintHtml";
import {
  loadApplicantInfo,
  saveApplicantInfo,
  emptyApplicantInfo,
} from "@/features/applicant-info";
import type { ComplaintRespondent } from "@/entities/report";

interface ReportDraftWizardViewProps {
  reportCase: ReportCase;
  onBack: () => void;
  /** 노동청 제출 완료 시 호출 — 부모가 SubmissionResultView로 전환. */
  onSubmitted?: () => void;
}

type StepKey = "negotiation" | "preview";
const STEPS: StepKey[] = ["negotiation", "preview"];

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

const DAMAGE_LABEL: Record<DamageTypeEnum, string> = {
  BASE_WAGE: "기본 임금 미지급",
  WEEKLY_HOLIDAY: "주휴수당 미지급",
  OVERTIME: "연장근로수당 미지급",
  NIGHT: "야간근로수당 미지급",
  SEVERANCE: "퇴직금 미지급",
};

export function ReportDraftWizardView({
  reportCase,
  onBack,
  onSubmitted,
}: ReportDraftWizardViewProps): JSX.Element {
  const [stepIdx, setStepIdx] = useState(0);
  const [negotiation, setNegotiation] = useState<NegotiationStatus>("refused");
  const [isGenerating, setIsGenerating] = useState(false);
  /** 진정인 정보 — AsyncStorage에서 로드 (로컬 전용, 백엔드 미전송). */
  const [applicant, setApplicant] = useState<ApplicantInfo | null>(null);

  useEffect(() => {
    void (async () => {
      const loaded = await loadApplicantInfo();
      setApplicant(loaded);
    })();
  }, []);
  /** 사용자가 직접 편집한 본문. null이면 구조화 미리보기 사용. */
  const [customBodyText, setCustomBodyText] = useState<string | null>(null);

  const currentStep = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const generatePdfUri = async (): Promise<string> => {
    const html = buildComplaintHtml({
      reportCase,
      negotiation,
      applicant,
      customBody: customBodyText ?? undefined,
    });
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
  const patchRespondent = useReportStore((s) => s.patchRespondent);

  /**
   * 수정 완료 핸들러 — 편집된 텍스트를 파싱해서
   *  ① customBodyText(PDF용) 저장
   *  ② applicant(진정인) 필드 → 로컬 AsyncStorage 갱신 → StructuredPreview에 반영
   *  ③ respondent(피진정인) 필드 → reportCase store 갱신 → StructuredPreview에 반영
   */
  const handleSaveEdits = (text: string): void => {
    setCustomBodyText(text);

    const getField = (section: string, key: string): string | null => {
      const m = section.match(new RegExp(`${key}:\\s*(.+)`));
      const v = m?.[1]?.trim();
      // 자리표시자 [...]는 미입력으로 간주
      if (!v || (v.startsWith("[") && v.endsWith("]"))) return null;
      return v;
    };

    const between = (full: string, from: string, to: string): string => {
      const s = full.indexOf(from);
      const e = full.indexOf(to, s + 1);
      if (s === -1) return "";
      return full.slice(s, e === -1 ? undefined : e);
    };

    // ② 진정인 파싱
    const aSec = between(text, "1. 진정인", "2. 피진정인");
    const aName    = getField(aSec, "성명");
    const aPhone   = getField(aSec, "연락처");
    const aMobile  = getField(aSec, "휴대전화번호");
    const aAddress = getField(aSec, "주소");
    const aEmail   = getField(aSec, "전자우편주소");
    if (aName ?? aPhone ?? aMobile ?? aAddress ?? aEmail) {
      const base = applicant ?? emptyApplicantInfo();
      const updated: ApplicantInfo = {
        ...base,
        fullName: aName ?? base.fullName,
        phone:    aPhone ?? base.phone,
        mobile:   aMobile ?? base.mobile,
        address:  aAddress ?? base.address,
        email:    aEmail ?? base.email,
      };
      setApplicant(updated);
      void saveApplicantInfo(updated);
    }

    // ③ 피진정인 파싱
    const rSec = between(text, "2. 피진정인", "3. 진정 내용");
    const rRep     = getField(rSec, "대표자");
    const rPhone   = getField(rSec, "연락처");
    const rAddress = getField(rSec, "주소");
    if (rRep ?? rPhone ?? rAddress) {
      const patch: Partial<ComplaintRespondent> = {};
      if (rRep)     patch.representativeName = rRep;
      if (rPhone)   patch.phone = rPhone;
      if (rAddress) patch.address = rAddress;
      patchRespondent(reportCase.id, patch);
    }
  };

  // 고용24 외부 브라우저 흐름 — 직접 URL 오픈 + AppState 복귀 감지로 확인 배너 노출.
  const GOYO24_URL =
    "https://labor.moel.go.kr/minwonApply/minwonFormat.do?searchVal=SN001";
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [browserOpened, setBrowserOpened] = useState(false);
  const [returnedFromBrowser, setReturnedFromBrowser] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
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
    updateCaseStatus(reportCase.id, "INSPECTING");
    setSubmittedAt(reportCase.id, new Date().toISOString());
    setReturnedFromBrowser(false);
    setBrowserOpened(false);
    if (onSubmitted !== undefined) onSubmitted();
  };

  const handlePrev = (): void => {
    if (stepIdx === 0) {
      onBack();
      return;
    }
    setStepIdx(stepIdx - 1);
  };

  const handleNext = (): void => {
    if (!isLast) setStepIdx(stepIdx + 1);
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
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === stepIdx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= stepIdx ? "#3182F6" : "#E2E8F0",
            }}
          />
        ))}
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
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* 사용자가 evidence 단계에서 입력한 데이터 요약 카드 */}
        <DataSummaryCard reportCase={reportCase} />

        {currentStep === "negotiation" ? (
          <View style={{ marginTop: 16 }}>
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
            <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
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
        ) : (
          <ComplaintPreview
            reportCase={reportCase}
            negotiationText={
              NEGOTIATION_OPTIONS.find((o) => o.id === negotiation)
                ?.draftText ?? ""
            }
            applicant={applicant}
            onSavePdf={() => void handleSavePdf()}
            onShare={() => void handleShare()}
            onSubmit={() => void handleSubmitToMinistry()}
            returnedFromBrowser={returnedFromBrowser}
            onConfirmSubmitted={handleConfirmSubmitted}
            onNotYet={() => setReturnedFromBrowser(false)}
            customBodyText={customBodyText}
            onSaveCustom={handleSaveEdits}
          />
        )}
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
            style={{
              flex: 2,
              paddingVertical: 14,
              backgroundColor: "#3182F6",
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
            >
              다음 (미리보기)
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
              style={{ fontSize: 13, color: "#475569", marginTop: 12 }}
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
// evidence 단계에서 수집된 데이터 요약 카드
// ──────────────────────────────────────────

function DataSummaryCard({
  reportCase,
}: {
  reportCase: ReportCase;
}): JSX.Element {
  const facts = reportCase.facts ?? null;
  const damages = reportCase.damageTypeEnums ?? [];
  return (
    <View
      style={{
        backgroundColor: "#EBF3FF",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#B5D4F4",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: "#185FA5",
          marginBottom: 8,
        }}
      >
        ✓ 입력하신 신고 정보
      </Text>
      <SummaryRow label="사업장" value={reportCase.workplaceName} />
      {damages.length > 0 ? (
        <SummaryRow
          label="피해 유형"
          value={damages.map((d) => DAMAGE_LABEL[d]).join(", ")}
        />
      ) : null}
      {facts?.totalUnpaidWage !== null && facts?.totalUnpaidWage !== undefined ? (
        <SummaryRow
          label="체불 총액"
          value={`₩${facts.totalUnpaidWage.toLocaleString()}`}
        />
      ) : null}
      {facts?.employmentStartDate !== null &&
      facts?.employmentStartDate !== undefined ? (
        <SummaryRow
          label="근무 기간"
          value={`${facts.employmentStartDate} ~ ${facts.employmentEndDate ?? "재직 중"}`}
        />
      ) : null}
    </View>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 12, color: "#185FA5", width: 80 }}>{label}</Text>
      <Text
        style={{
          flex: 1,
          fontSize: 12,
          color: "#0F172A",
          fontWeight: "600",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────

interface PreviewProps {
  reportCase: ReportCase;
  negotiationText: string;
  applicant: ApplicantInfo | null;
  onSavePdf: () => void;
  onShare: () => void;
  onSubmit: () => void;
  returnedFromBrowser: boolean;
  onConfirmSubmitted: () => void;
  onNotYet: () => void;
  customBodyText: string | null;
  onSaveCustom: (text: string) => void;
}

function ComplaintPreview({
  reportCase,
  negotiationText,
  applicant,
  onSavePdf,
  onShare,
  onSubmit,
  returnedFromBrowser,
  onConfirmSubmitted,
  onNotYet,
  customBodyText,
  onSaveCustom,
}: PreviewProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // AI(Gemini) 진정 내용 생성 — 서버에 저장된 사건(사업장 검색으로 시작)에서 동작.
  // 성공 시 본문을 AI 줄글로 채움. 클라이언트 전용 사건이면 서버가 거부 → 안내.
  const handleGenerateAi = async (): Promise<void> => {
    setAiGenerating(true);
    try {
      const text = await generateReportDraft(reportCase.id);
      if (text.trim().length > 0) {
        onSaveCustom(text);
      } else {
        Alert.alert(
          "생성 실패",
          "AI 진정 내용을 받지 못했어요. 잠시 후 다시 시도해주세요.",
        );
      }
    } catch (err) {
      // 에러 종류를 구분: 403/404(사건 미저장·권한)만 "서버 저장 신고" 안내,
      // 그 외(500·503 등 Gemini 일시 장애)는 재시도 안내.
      const status =
        (err as { response?: { status?: number } })?.response?.status ?? null;
      if (status === 403 || status === 404) {
        Alert.alert(
          "AI 생성 불가",
          "서버에 저장된 신고에서만 AI 생성을 쓸 수 있어요. '사업장 찾기'로 시작한 신고에서 사용해보세요.",
        );
      } else {
        Alert.alert(
          "잠시 후 다시 시도해주세요",
          "AI 생성 서버가 일시적으로 혼잡해요(잠깐 과부하). 잠시 후 다시 시도하면 정상 생성됩니다.",
        );
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const damages = reportCase.damageTypeEnums ?? [];
  const facts = reportCase.facts;
  const respondent = reportCase.respondent;
  const total = facts?.totalUnpaidWage ?? 0;
  const today = new Date().toLocaleDateString("ko-KR");

  const applicantName = applicant?.fullName ?? "[성명]";
  const applicantPhone = applicant?.phone ?? applicant?.mobile ?? "[연락처]";

  const buildDefaultBodyText = (): string => {
    const lines: string[] = [
      `진　정　서`,
      ``,
      `1. 진정인`,
      `   성명: ${applicantName}`,
      `   연락처: ${applicantPhone}`,
      `   주소: ${applicant?.address ?? "[주소]"}`,
      ``,
      `2. 피진정인`,
      `   사업장명: ${reportCase.workplaceName}`,
      `   대표자: ${respondent?.representativeName ?? "[사업주명]"}`,
      `   연락처: ${respondent?.phone ?? "[사업주 연락처]"}`,
      `   주소: ${respondent?.address ?? "[사업장 주소]"}`,
      ``,
      `3. 진정 내용`,
      `   입사일: ${facts?.employmentStartDate ?? "-"}`,
      facts?.employmentStatus === "FORMER"
        ? `   퇴사일: ${facts?.employmentEndDate ?? "-"}`
        : `   재직 상태: 재직 중`,
      `   체불임금 총액: ₩${total.toLocaleString()}`,
      ``,
      `   피해 유형:`,
      ...damages.map((d: DamageTypeEnum) => `     - ${DAMAGE_LABEL[d]}`),
      ``,
      `   상황 설명:`,
      `   ${reportCase.freeFormDescription ?? "(상황 설명 미입력)"}`,
      ``,
      `   협의 시도 여부: ${negotiationText}`,
      ``,
      `위와 같이 진정합니다.`,
      `${today}`,
      `진정인: ${applicantName} (서명)`,
      ``,
      `[관할 고용노동청] 귀하`,
    ];
    return lines.join("\n");
  };

  const handleEnterEdit = (): void => {
    // AI 생성/이전 수정 본문이 있으면 그걸 이어서 편집, 없으면 기본 양식 구조로 시작.
    setDraftText(customBodyText ?? buildDefaultBodyText());
    setIsEditing(true);
  };

  return (
    <View style={{ marginTop: 16 }}>
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

      {applicant === null ? (
        <View
          style={{
            backgroundColor: "#FEF3C7",
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            flexDirection: "row",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="warning"
            size={14}
            color="#92400E"
            style={{ marginTop: 1 }}
          />
          <Text style={{ flex: 1, fontSize: 12, color: "#92400E", lineHeight: 18 }}>
            진정인(본인) 정보가 없어 자리표시자로 채워집니다. "직접 수정하기"로 성명·연락처·주소를 채워넣으세요.
          </Text>
        </View>
      ) : null}
      {customBodyText !== null ? (
        <View
          style={{
            backgroundColor: "#EBF3FF",
            borderRadius: 10,
            padding: 10,
            marginBottom: 8,
            flexDirection: "row",
            gap: 6,
            alignItems: "center",
          }}
        >
          <Ionicons name="checkmark-circle" size={14} color="#1A5FAF" />
          <Text style={{ flex: 1, fontSize: 12, color: "#185FA5" }}>
            수정된 내용이 PDF에 적용됩니다. 아래 양식은 원본 구조로 표시돼요.
          </Text>
        </View>
      ) : null}

      {/* 미리보기 위 액션 줄 */}
      {!isEditing ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Pressable
            onPress={() => void handleGenerateAi()}
            disabled={aiGenerating}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: aiGenerating ? "#A5B4FC" : "#6366F1",
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            {aiGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="sparkles-outline" size={12} color="#FFFFFF" />
            )}
            <Text style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "600" }}>
              {aiGenerating ? "생성 중…" : "AI로 생성"}
            </Text>
          </Pressable>
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
              직접 수정하기
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
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={() => {
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
                  style={{
                    fontSize: 13,
                    color: "#475569",
                    fontWeight: "600",
                  }}
                >
                  취소
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onSaveCustom(draftText);
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
                  style={{
                    fontSize: 13,
                    color: "#FFFFFF",
                    fontWeight: "600",
                  }}
                >
                  수정 완료
                </Text>
              </Pressable>
            </View>
          </>
        ) : customBodyText !== null ? (
          // AI 생성/직접 수정 본문이 있으면 화면에도 그대로 보여준다.
          // (이전엔 항상 StructuredPreview만 렌더해 AI 결과가 화면에 안 보였음)
          <Text style={previewLineStyle}>{customBodyText}</Text>
        ) : (
          // 본문 미작성 시에만 공식 양식 테이블 렌더.
          <StructuredPreview
            reportCase={reportCase}
            negotiationText={negotiationText}
            applicant={applicant}
          />
        )}
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
          <Text style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}>
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
          <Text style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}>
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
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
          노동청에 제출하기 (고용24)
        </Text>
      </Pressable>

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
            제출을 완료하셨다면 아래 버튼을 눌러주세요. 앱에서 다음 단계를 안내해드립니다.
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
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
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

// ──────────────────────────────────────────
// 구조화 미리보기 (수정 모드 아닐 때 자동 렌더)
// ──────────────────────────────────────────

function StructuredPreview({
  reportCase,
  negotiationText,
  applicant,
}: {
  reportCase: ReportCase;
  negotiationText: string;
  applicant: ApplicantInfo | null;
}): JSX.Element {
  const damages = reportCase.damageTypeEnums ?? [];
  const facts = reportCase.facts;
  const respondent = reportCase.respondent;
  const laborOffice = reportCase.business?.laborOffice ?? "";

  const employeeCountText =
    respondent?.employeeCount !== null && respondent?.employeeCount !== undefined
      ? `${respondent.employeeCount}명`
      : "";

  return (
    <>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: "#0F172A",
          textAlign: "center",
          letterSpacing: 10,
          marginBottom: 16,
        }}
      >
        진　정　서
      </Text>

      {/* 1. 진정인 */}
      <Text style={previewSectionStyle}>1. 진정인</Text>
      <View style={tableStyle}>
        <DoubleRow
          labelA="성　　명"
          valueA={applicant?.fullName ?? ""}
          labelB="주민등록번호"
          valueB={applicant?.rrn ?? ""}
        />
        <SingleRow label="주　　소" value={applicant?.address ?? ""} />
        <DoubleRow
          labelA="전 화 번 호"
          valueA={applicant?.phone ?? ""}
          labelB="휴대전화번호"
          valueB={applicant?.mobile ?? ""}
        />
        <SingleRow label="전자우편주소" value={applicant?.email ?? ""} />
        <DoubleRow
          labelA="처리상황 수신여부"
          valueA={renderYesNo(applicant?.wantsResultNotice)}
          labelB="노동포털 통지여부"
          valueB={renderYesNo(applicant?.wantsLaborOfficeNotice)}
        />
      </View>

      {/* 2. 피진정인 */}
      <Text style={previewSectionStyle}>2. 피진정인</Text>
      <View style={tableStyle}>
        <DoubleRow
          labelA="성　　명"
          valueA={respondent?.representativeName ?? ""}
          labelB="연 락 처"
          valueB={respondent?.phone ?? ""}
        />
        <SingleRow label="주　　소" value={respondent?.address ?? ""} />
        <SingleRow
          label="사업체 구분"
          value={`${cbox(respondent?.businessType === "WORKPLACE")} 사업장   ${cbox(
            respondent?.businessType === "CONSTRUCTION_SITE",
          )} 공사현장`}
        />
        <SingleRow
          label="사 업 장 명"
          value={respondent?.workplaceName ?? reportCase.workplaceName}
        />
        <SingleRow
          label={"사업장 주소\n(실근무장소)"}
          value={respondent?.address ?? ""}
        />
        <DoubleRow
          labelA="사업장전화번호"
          valueA={respondent?.workplacePhone ?? ""}
          labelB="근 로 자 수"
          valueB={employeeCountText}
        />
      </View>

      {/* 3. 진정 내용 */}
      <Text style={previewSectionStyle}>3. 진정 내용</Text>
      <View style={tableStyle}>
        <DoubleRow
          labelA="입 사 일"
          valueA={facts?.employmentStartDate ?? ""}
          labelB="퇴 사 일"
          valueB={facts?.employmentEndDate ?? ""}
        />
        <DoubleRow
          labelA="체불임금총액"
          valueA={formatMoneyOrEmpty(facts?.totalUnpaidWage ?? null)}
          labelB="퇴직 여부"
          valueB={`${cbox(facts?.employmentStatus === "FORMER")} 퇴직   ${cbox(facts?.employmentStatus === "CURRENT")} 재직`}
        />
        <DoubleRow
          labelA="체불퇴직금액"
          valueA={formatMoneyOrEmpty(facts?.unpaidSeverance ?? null)}
          labelB="기타체불금액"
          valueB={formatMoneyOrEmpty(facts?.otherUnpaid ?? null)}
        />
        <SingleRow label="업 무 내 용" value={facts?.jobDescription ?? ""} />
        <DoubleRow
          labelA="임금 지급일"
          valueA={facts?.wagePaymentDate ?? ""}
          labelB="근로계약방법"
          valueB={`${cbox(facts?.contractMethod === "WRITTEN")} 서면   ${cbox(facts?.contractMethod === "ORAL")} 구두`}
        />

        {/* 내용 — 큰 텍스트 칸 */}
        <View style={contentRowStyle}>
          <View style={contentLabelStyle}>
            <Text style={labelTextStyle}>내　　용</Text>
          </View>
          <View style={contentValueStyle}>
            <Text style={contentSubLabelStyle}>[피해 유형]</Text>
            {damages.length > 0 ? (
              damages.map((d) => (
                <Text key={d} style={contentBodyStyle}>
                  · {DAMAGE_LABEL[d]}
                </Text>
              ))
            ) : (
              <Text style={contentBodyStyle}>· 임금체불</Text>
            )}

            <Text style={[contentSubLabelStyle, { marginTop: 8 }]}>
              [상황 설명]
            </Text>
            <Text style={contentBodyStyle}>
              {reportCase.freeFormDescription ?? ""}
            </Text>

            <Text style={[contentSubLabelStyle, { marginTop: 8 }]}>
              [협의 시도 여부]
            </Text>
            <Text style={contentBodyStyle}>{negotiationText}</Text>
          </View>
        </View>

        {/* 파일 첨부 */}
        <View style={[contentRowStyle, { borderBottomWidth: 0 }]}>
          <View style={contentLabelStyle}>
            <Text style={labelTextStyle}>파 일 첨 부</Text>
          </View>
          <View style={contentValueStyle}>
            {(reportCase.evidenceFiles ?? []).length === 0 ? (
              <Text style={contentBodyStyle}> </Text>
            ) : (
              (reportCase.evidenceFiles ?? []).map((f, i) => (
                <Text key={f.id} style={contentBodyStyle}>
                  {i + 1}. {f.name}
                </Text>
              ))
            )}
          </View>
        </View>
      </View>

      <Text
        style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 14,
          fontWeight: "600",
          color: "#0F172A",
          letterSpacing: 1,
        }}
      >
        (　{laborOffice}　)고용노동(지)청장 귀하
      </Text>
    </>
  );
}

// ──────────────────────────────────────────
// Preview 폼 helper
// ──────────────────────────────────────────

function cbox(on: boolean): string {
  return on ? "■" : "☐";
}

function renderYesNo(v: boolean | undefined): string {
  return `${cbox(v === true)} 예   ${cbox(v === false)} 아니오`;
}

function formatMoneyOrEmpty(v: number | null): string {
  if (v === null || v === 0) return "";
  return `${v.toLocaleString()}원`;
}

function SingleRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <View style={rowStyle}>
      <View style={labelCellStyle}>
        <Text style={labelTextStyle}>{label}</Text>
      </View>
      <View style={[valueCellStyle, { flex: 3 }]}>
        <Text style={valueTextStyle}>{value}</Text>
      </View>
    </View>
  );
}

function DoubleRow({
  labelA,
  valueA,
  labelB,
  valueB,
}: {
  labelA: string;
  valueA: string;
  labelB: string;
  valueB: string;
}): JSX.Element {
  return (
    <View style={rowStyle}>
      <View style={labelCellStyle}>
        <Text style={labelTextStyle}>{labelA}</Text>
      </View>
      <View style={valueCellStyle}>
        <Text style={valueTextStyle}>{valueA}</Text>
      </View>
      <View style={labelCellStyle}>
        <Text style={labelTextStyle}>{labelB}</Text>
      </View>
      <View style={valueCellStyle}>
        <Text style={valueTextStyle}>{valueB}</Text>
      </View>
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

const tableStyle = {
  borderWidth: 1,
  borderColor: "#222",
  borderRadius: 2,
} as const;

const rowStyle = {
  flexDirection: "row",
  borderBottomWidth: 1,
  borderBottomColor: "#222",
  minHeight: 32,
} as const;

const labelCellStyle = {
  flex: 1.1,
  backgroundColor: "#F4F5F7",
  paddingHorizontal: 6,
  paddingVertical: 6,
  justifyContent: "center",
  borderRightWidth: 1,
  borderRightColor: "#222",
} as const;

const valueCellStyle = {
  flex: 1.4,
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 6,
  paddingVertical: 6,
  justifyContent: "center",
  borderRightWidth: 1,
  borderRightColor: "#222",
} as const;

const labelTextStyle = {
  fontSize: 11,
  color: "#222",
  fontWeight: "500" as const,
} as const;

const valueTextStyle = {
  fontSize: 11,
  color: "#0F172A",
} as const;

const contentRowStyle = {
  flexDirection: "row",
  borderBottomWidth: 1,
  borderBottomColor: "#222",
  minHeight: 80,
} as const;

const contentLabelStyle = {
  flex: 1.1,
  backgroundColor: "#F4F5F7",
  paddingHorizontal: 6,
  paddingVertical: 8,
  justifyContent: "flex-start",
  borderRightWidth: 1,
  borderRightColor: "#222",
} as const;

const contentValueStyle = {
  flex: 3.9,
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 8,
  paddingVertical: 8,
} as const;

const contentSubLabelStyle = {
  fontSize: 11,
  fontWeight: "700" as const,
  color: "#333",
  marginBottom: 2,
} as const;

const contentBodyStyle = {
  fontSize: 11,
  color: "#0F172A",
  lineHeight: 18,
  marginLeft: 4,
} as const;

