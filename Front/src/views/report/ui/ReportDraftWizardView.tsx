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
import {
  buildComplaintHtml,
  type NegotiationStatus,
} from "@/features/report-submit/lib/buildComplaintHtml";
import { loadApplicantInfo } from "@/features/applicant-info";

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

  // 고용24 외부 브라우저 흐름 — 직접 URL 오픈 + AppState 복귀 감지로 확인 배너 노출.
  const GOYO24_URL = "https://labor.moel.go.kr/minwon/minwonProcess.do";
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
            onSaveCustom={setCustomBodyText}
            onResetCustom={() => setCustomBodyText(null)}
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
  onResetCustom: () => void;
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
  onResetCustom,
}: PreviewProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState("");

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
    const initial = customBodyText ?? buildDefaultBodyText();
    setDraftText(initial);
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
            진정인(본인) 정보가 없어 자리표시자로 채워집니다. 마이페이지에서 등록하면 PDF에 자동 반영돼요.
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
          {customBodyText !== null ? (
            <Pressable
              onPress={onResetCustom}
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
                  onResetCustom();
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
          <Text style={previewLineStyle}>{customBodyText}</Text>
        ) : (
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
  const total = facts?.totalUnpaidWage ?? 0;
  const today = new Date().toLocaleDateString("ko-KR");

  const applicantName = applicant?.fullName ?? "[성명]";
  const applicantPhone = applicant?.phone ?? applicant?.mobile ?? "[연락처]";
  const applicantAddress = applicant?.address ?? "[주소]";

  return (
    <>
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

      <Text style={previewSectionStyle}>1. 진정인</Text>
      <Text style={previewLineStyle}>{`   성명: ${applicantName}`}</Text>
      <Text style={previewLineStyle}>{`   연락처: ${applicantPhone}`}</Text>
      <Text style={previewLineStyle}>{`   주소: ${applicantAddress}`}</Text>

      <Text style={previewSectionStyle}>2. 피진정인</Text>
      <Text style={previewLineStyle}>
        {`   사업장명: ${reportCase.workplaceName}`}
      </Text>
      <Text style={previewLineStyle}>
        {`   대표자: ${respondent?.representativeName ?? "[사업주명]"}`}
      </Text>
      <Text style={previewLineStyle}>
        {`   연락처: ${respondent?.phone ?? "[사업주 연락처]"}`}
      </Text>
      <Text style={previewLineStyle}>
        {`   주소: ${respondent?.address ?? "[사업장 주소]"}`}
      </Text>

      <Text style={previewSectionStyle}>3. 진정 내용</Text>
      <Text style={previewLineStyle}>
        {`   입사일: ${facts?.employmentStartDate ?? "-"}`}
      </Text>
      {facts?.employmentStatus === "FORMER" ? (
        <Text style={previewLineStyle}>
          {`   퇴사일: ${facts?.employmentEndDate ?? "-"}`}
        </Text>
      ) : (
        <Text style={previewLineStyle}>{`   재직 상태: 재직 중`}</Text>
      )}
      <Text style={previewLineStyle}>
        {`   체불임금 총액: ₩${total.toLocaleString()}`}
      </Text>

      <Text
        style={{ ...previewLineStyle, marginTop: 8, fontWeight: "600" }}
      >
        {`   피해 유형`}
      </Text>
      {damages.map((d) => (
        <Text key={d} style={previewLineStyle}>
          {`     - ${DAMAGE_LABEL[d]}`}
        </Text>
      ))}

      <Text style={{ ...previewLineStyle, marginTop: 8, fontWeight: "600" }}>
        {`   상황 설명`}
      </Text>
      <Text style={previewLineStyle}>
        {`   ${reportCase.freeFormDescription ?? "(상황 설명 미입력)"}`}
      </Text>

      <Text style={{ ...previewLineStyle, marginTop: 8, fontWeight: "600" }}>
        {`   협의 시도 여부`}
      </Text>
      <Text style={previewLineStyle}>{`   ${negotiationText}`}</Text>

      <Text style={{ ...previewLineStyle, marginTop: 14 }}>
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
        {`진정인: ${applicantName} (서명)`}
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
