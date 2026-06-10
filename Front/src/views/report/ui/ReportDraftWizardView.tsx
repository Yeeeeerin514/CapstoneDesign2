import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ScreenHeader } from "@/shared/ui";
import { useReportStore } from "@/features/report-submit";
import type {
  ApplicantInfo,
  DamageTypeEnum,
  ReportCase,
} from "@/entities/report";
import { generateReportDraft } from "@/entities/report";
import type { NegotiationStatus } from "@/features/report-submit/lib/buildComplaintHtml";
import {
  buildComplaintDoc,
  type ComplaintFormData,
} from "@/features/report-submit/lib/buildComplaintDoc";
import {
  loadApplicantInfo,
  saveApplicantInfo,
  emptyApplicantInfo,
} from "@/features/applicant-info";

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
}> = [
  { id: "refused", label: "협의 요청했지만 거부당했어요" },
  { id: "not-tried", label: "아직 협의 시도를 안 했어요" },
  { id: "no-response", label: "연락이 안 돼요" },
];

const DAMAGE_LABEL: Record<DamageTypeEnum, string> = {
  BASE_WAGE: "기본 임금 미지급",
  WEEKLY_HOLIDAY: "주휴수당 미지급",
  OVERTIME: "연장근로수당 미지급",
  NIGHT: "야간근로수당 미지급",
  SEVERANCE: "퇴직금 미지급",
};

/** 웹에서 .doc 파일을 Blob으로 만들어 브라우저 다운로드를 트리거한다. */
function downloadDocOnWeb(html: string, fileName: string): void {
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function moneyDisplay(v: number | null | undefined): string {
  if (v === null || v === undefined || v === 0) return "";
  return `${v.toLocaleString()}원`;
}

/** reportCase + 진정인 + AI 본문을 합쳐 편집 폼 초기값을 만든다. */
function buildInitialForm(
  reportCase: ReportCase,
  applicant: ApplicantInfo | null,
  aiContent: string,
): ComplaintFormData {
  const facts = reportCase.facts;
  const respondent = reportCase.respondent;
  const damages = reportCase.damageTypeEnums ?? [];
  const damageLines =
    damages.length > 0
      ? damages.map((d) => `· ${DAMAGE_LABEL[d]}`).join("\n")
      : "· 임금체불";
  const attachments = (reportCase.evidenceFiles ?? [])
    .map((f, i) => `${i + 1}. ${f.name}`)
    .join("\n");

  // AI 본문이 있으면 그대로, 없으면 피해 유형/상황 설명으로 기본 골격을 채운다.
  const content =
    aiContent.trim().length > 0
      ? aiContent
      : `[피해 유형]\n${damageLines}\n\n[상황 설명]\n${reportCase.freeFormDescription ?? ""}`;

  return {
    applicantName: applicant?.fullName ?? "",
    applicantRrn: applicant?.rrn ?? "",
    applicantAddress: applicant?.address ?? "",
    applicantPhone: applicant?.phone ?? "",
    applicantMobile: applicant?.mobile ?? "",
    applicantEmail: applicant?.email ?? "",
    wantsResultNotice: applicant?.wantsResultNotice ?? null,
    wantsLaborOfficeNotice: applicant?.wantsLaborOfficeNotice ?? null,

    respondentName: respondent?.representativeName ?? "",
    respondentPhone: respondent?.phone ?? "",
    respondentAddress: respondent?.address ?? "",
    businessType: respondent?.businessType ?? null,
    workplaceName: respondent?.workplaceName ?? reportCase.workplaceName,
    workplaceAddress: respondent?.address ?? "",
    workplacePhone: respondent?.workplacePhone ?? "",
    employeeCount:
      respondent?.employeeCount !== null && respondent?.employeeCount !== undefined
        ? `${respondent.employeeCount}명`
        : "",

    employmentStartDate: facts?.employmentStartDate ?? "",
    employmentEndDate: facts?.employmentEndDate ?? "",
    totalUnpaidWage: moneyDisplay(facts?.totalUnpaidWage),
    employmentStatus: facts?.employmentStatus ?? null,
    unpaidSeverance: moneyDisplay(facts?.unpaidSeverance),
    otherUnpaid: moneyDisplay(facts?.otherUnpaid),
    jobDescription: facts?.jobDescription ?? "",
    wagePaymentDate: facts?.wagePaymentDate ?? "",
    contractMethod: facts?.contractMethod ?? null,
    content,
    attachments,
    laborOffice: reportCase.business?.laborOffice ?? "",
  };
}

export function ReportDraftWizardView({
  reportCase,
  onBack,
  onSubmitted,
}: ReportDraftWizardViewProps): JSX.Element {
  const [stepIdx, setStepIdx] = useState(0);
  const [negotiation, setNegotiation] = useState<NegotiationStatus>("refused");
  /** "진정 내용 생성하기" 진행 중 표시. */
  const [isGenerating, setIsGenerating] = useState(false);
  /** AI(Gemini)가 생성한 진정 내용 — 미리보기에서 편집 가능. */
  const [aiContent, setAiContent] = useState("");
  /** 진정인 정보 — AsyncStorage에서 로드 (로컬 전용, 백엔드 미전송). */
  const [applicant, setApplicant] = useState<ApplicantInfo | null>(null);

  useEffect(() => {
    void (async () => {
      const loaded = await loadApplicantInfo();
      setApplicant(loaded);
    })();
  }, []);

  const currentStep = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  // 고용24 외부 브라우저 흐름 — 직접 URL 오픈 + AppState 복귀 감지로 확인 배너 노출.
  const GOYO24_URL =
    "https://labor.moel.go.kr/minwonApply/minwonFormat.do?searchVal=SN001";
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [browserOpened, setBrowserOpened] = useState(false);
  const [returnedFromBrowser, setReturnedFromBrowser] = useState(false);

  const completeStepAction = useReportStore((s) => s.completeStep);
  const setCurrentStepAction = useReportStore((s) => s.setCurrentStep);
  const updateCaseStatus = useReportStore((s) => s.updateCaseStatus);
  const setSubmittedAt = useReportStore((s) => s.setSubmittedAt);

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

  /**
   * "진정 내용 생성하기" — 백엔드에 AI 진정 내용을 요청한 뒤 미리보기로 이동.
   * 생성에 실패해도 빈 본문으로 미리보기에 진입해 사용자가 직접 작성할 수 있게 한다.
   */
  const handleGenerateNext = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const text = await generateReportDraft(reportCase.id, negotiation);
      setAiContent(text);
      if (text.trim().length === 0) {
        Alert.alert(
          "안내",
          "AI 진정 내용을 받지 못했어요. 미리보기에서 직접 작성하거나 다시 시도해주세요.",
        );
      }
    } catch (err) {
      const status =
        (err as { response?: { status?: number } })?.response?.status ?? null;
      if (status === 403 || status === 404) {
        Alert.alert(
          "AI 생성 불가",
          "서버에 저장된 신고에서만 AI 생성을 쓸 수 있어요. 미리보기에서 진정 내용을 직접 작성해주세요.",
        );
      } else {
        Alert.alert(
          "잠시 후 다시 시도해주세요",
          "AI 생성 서버가 일시적으로 혼잡해요. 미리보기에서 직접 작성하거나 잠시 후 다시 시도해주세요.",
        );
      }
      setAiContent("");
    } finally {
      setIsGenerating(false);
      setStepIdx(STEPS.indexOf("preview"));
    }
  };

  /** 편집된 진정인 항목을 로컬(AsyncStorage)에 반영. */
  const persistApplicant = (form: ComplaintFormData): void => {
    const base = applicant ?? emptyApplicantInfo();
    const updated: ApplicantInfo = {
      ...base,
      fullName: form.applicantName,
      rrn: form.applicantRrn,
      address: form.applicantAddress,
      phone: form.applicantPhone,
      mobile: form.applicantMobile,
      email: form.applicantEmail,
      wantsResultNotice: form.wantsResultNotice ?? base.wantsResultNotice,
      wantsLaborOfficeNotice:
        form.wantsLaborOfficeNotice ?? base.wantsLaborOfficeNotice,
    };
    setApplicant(updated);
    void saveApplicantInfo(updated);
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
              선택에 따라 AI가 생성하는 진정 내용 문구가 달라집니다
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
            applicant={applicant}
            aiContent={aiContent}
            onSubmit={() => void handleSubmitToMinistry()}
            returnedFromBrowser={returnedFromBrowser}
            onConfirmSubmitted={handleConfirmSubmitted}
            onNotYet={() => setReturnedFromBrowser(false)}
            onPersistApplicant={persistApplicant}
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
            disabled={isGenerating}
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
            <Text style={{ color: "#475569", fontSize: 14, fontWeight: "500" }}>
              취소
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleGenerateNext()}
            disabled={isGenerating}
            style={{
              flex: 2,
              paddingVertical: 14,
              backgroundColor: isGenerating ? "#A8C7F8" : "#3182F6",
              borderRadius: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="sparkles-outline" size={14} color="#FFFFFF" />
            )}
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
              {isGenerating ? "AI가 진정 내용 생성 중…" : "진정 내용 생성하기"}
            </Text>
          </Pressable>
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
    <View style={{ flexDirection: "row", paddingVertical: 4 }}>
      <Text style={{ fontSize: 12, color: "#185FA5", width: 80 }}>{label}</Text>
      <Text
        style={{ flex: 1, fontSize: 12, color: "#0F172A", fontWeight: "600" }}
      >
        {value}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────
// 진정서 미리보기 — 모든 항목 편집 가능 + .doc 다운로드
// ──────────────────────────────────────────

interface PreviewProps {
  reportCase: ReportCase;
  applicant: ApplicantInfo | null;
  aiContent: string;
  onSubmit: () => void;
  returnedFromBrowser: boolean;
  onConfirmSubmitted: () => void;
  onNotYet: () => void;
  onPersistApplicant: (form: ComplaintFormData) => void;
}

function ComplaintPreview({
  reportCase,
  applicant,
  aiContent,
  onSubmit,
  returnedFromBrowser,
  onConfirmSubmitted,
  onNotYet,
  onPersistApplicant,
}: PreviewProps): JSX.Element {
  const [form, setForm] = useState<ComplaintFormData>(() =>
    buildInitialForm(reportCase, applicant, aiContent),
  );
  const [isDownloading, setIsDownloading] = useState(false);
  /** applicant/aiContent가 비동기로 늦게 도착하면 폼을 한 번 다시 채운다(사용자 미편집 시에만). */
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (applicant !== null || aiContent.trim().length > 0) {
      setForm(buildInitialForm(reportCase, applicant, aiContent));
      hydratedRef.current = true;
    }
  }, [applicant, aiContent, reportCase]);

  const setField = <K extends keyof ComplaintFormData>(
    key: K,
    value: ComplaintFormData[K],
  ): void => {
    hydratedRef.current = true; // 사용자가 손대면 자동 재채움 중단
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDownload = async (): Promise<void> => {
    setIsDownloading(true);
    try {
      onPersistApplicant(form);
      const html = buildComplaintDoc(form);
      // 파일 경로에 한글/공백이 들어가면 일부 기기에서 쓰기·공유가 실패하므로 ASCII 파일명 사용.
      const idPart = reportCase.id.replace(/[^A-Za-z0-9]+/g, "");
      const fileName = `complaint_${idPart.length > 0 ? idPart : "report"}.doc`;

      // 웹(Expo Web/브라우저)에서는 expo-file-system이 동작하지 않으므로 Blob 다운로드 사용.
      if (Platform.OS === "web") {
        downloadDocOnWeb(html, fileName);
        return;
      }

      const dir = FileSystem.cacheDirectory;
      if (dir === null) {
        throw new Error("저장 공간(cacheDirectory)을 사용할 수 없습니다.");
      }
      const fileUri = `${dir}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("저장됨", `진정서가 생성되었습니다.\n${fileUri}`);
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/msword",
        dialogTitle: "진정서 다운로드",
        UTI: "com.microsoft.word.doc",
      });
    } catch (error) {
      console.error("DOC 생성 실패:", error);
      const detail =
        error instanceof Error ? error.message : "알 수 없는 오류";
      Alert.alert("오류", `진정서 다운로드에 실패했습니다.\n(${detail})`);
    } finally {
      setIsDownloading(false);
    }
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
        내용을 확인하고 필요한 부분을 직접 수정한 뒤 다운로드하세요
      </Text>

      {/* 1. 진정인 */}
      <SectionCard title="1. 진정인">
        <EditRow label="성명" value={form.applicantName} onChangeText={(v) => setField("applicantName", v)} />
        <EditRow label="주민등록번호" value={form.applicantRrn} onChangeText={(v) => setField("applicantRrn", v)} />
        <EditRow label="주소" value={form.applicantAddress} onChangeText={(v) => setField("applicantAddress", v)} />
        <EditRow label="전화번호" value={form.applicantPhone} onChangeText={(v) => setField("applicantPhone", v)} keyboardType="phone-pad" />
        <EditRow label="휴대전화번호" value={form.applicantMobile} onChangeText={(v) => setField("applicantMobile", v)} keyboardType="phone-pad" />
        <EditRow label="전자우편주소" value={form.applicantEmail} onChangeText={(v) => setField("applicantEmail", v)} keyboardType="email-address" />
        <ToggleRow
          label="처리상황 수신여부"
          options={[
            { key: "yes", label: "예" },
            { key: "no", label: "아니오" },
          ]}
          selected={
            form.wantsResultNotice === true
              ? "yes"
              : form.wantsResultNotice === false
                ? "no"
                : null
          }
          onSelect={(k) => setField("wantsResultNotice", k === "yes")}
        />
        <ToggleRow
          label="노동포털 통지여부"
          options={[
            { key: "yes", label: "예" },
            { key: "no", label: "아니오" },
          ]}
          selected={
            form.wantsLaborOfficeNotice === true
              ? "yes"
              : form.wantsLaborOfficeNotice === false
                ? "no"
                : null
          }
          onSelect={(k) => setField("wantsLaborOfficeNotice", k === "yes")}
        />
      </SectionCard>

      {/* 2. 피진정인 */}
      <SectionCard title="2. 피진정인">
        <EditRow label="성명(대표자)" value={form.respondentName} onChangeText={(v) => setField("respondentName", v)} />
        <EditRow label="연락처" value={form.respondentPhone} onChangeText={(v) => setField("respondentPhone", v)} keyboardType="phone-pad" />
        <EditRow label="주소" value={form.respondentAddress} onChangeText={(v) => setField("respondentAddress", v)} />
        <ToggleRow
          label="사업체 구분"
          options={[
            { key: "WORKPLACE", label: "사업장" },
            { key: "CONSTRUCTION_SITE", label: "공사현장" },
          ]}
          selected={form.businessType}
          onSelect={(k) =>
            setField("businessType", k as ComplaintFormData["businessType"])
          }
        />
        <EditRow label="사업장명" value={form.workplaceName} onChangeText={(v) => setField("workplaceName", v)} />
        <EditRow label="사업장 주소" value={form.workplaceAddress} onChangeText={(v) => setField("workplaceAddress", v)} />
        <EditRow label="사업장전화번호" value={form.workplacePhone} onChangeText={(v) => setField("workplacePhone", v)} keyboardType="phone-pad" />
        <EditRow label="근로자 수" value={form.employeeCount} onChangeText={(v) => setField("employeeCount", v)} />
      </SectionCard>

      {/* 3. 진정 내용 */}
      <SectionCard title="3. 진정 내용">
        <EditRow label="입사일" value={form.employmentStartDate} onChangeText={(v) => setField("employmentStartDate", v)} />
        <EditRow label="퇴사일" value={form.employmentEndDate} onChangeText={(v) => setField("employmentEndDate", v)} />
        <EditRow label="체불임금총액" value={form.totalUnpaidWage} onChangeText={(v) => setField("totalUnpaidWage", v)} />
        <ToggleRow
          label="퇴직 여부"
          options={[
            { key: "FORMER", label: "퇴직" },
            { key: "CURRENT", label: "재직" },
          ]}
          selected={form.employmentStatus}
          onSelect={(k) =>
            setField(
              "employmentStatus",
              k as ComplaintFormData["employmentStatus"],
            )
          }
        />
        <EditRow label="체불퇴직금액" value={form.unpaidSeverance} onChangeText={(v) => setField("unpaidSeverance", v)} />
        <EditRow label="기타체불금액" value={form.otherUnpaid} onChangeText={(v) => setField("otherUnpaid", v)} />
        <EditRow label="업무내용" value={form.jobDescription} onChangeText={(v) => setField("jobDescription", v)} />
        <EditRow label="임금 지급일" value={form.wagePaymentDate} onChangeText={(v) => setField("wagePaymentDate", v)} />
        <ToggleRow
          label="근로계약방법"
          options={[
            { key: "WRITTEN", label: "서면" },
            { key: "ORAL", label: "구두" },
          ]}
          selected={form.contractMethod}
          onSelect={(k) =>
            setField("contractMethod", k as ComplaintFormData["contractMethod"])
          }
        />
        <EditRow
          label="내용 (AI 생성 진정 내용 · 직접 수정 가능)"
          value={form.content}
          onChangeText={(v) => setField("content", v)}
          multiline
        />
        <EditRow
          label="파일첨부"
          value={form.attachments}
          onChangeText={(v) => setField("attachments", v)}
          multiline
        />
      </SectionCard>

      {/* .doc 다운로드 */}
      <Pressable
        onPress={() => void handleDownload()}
        disabled={isDownloading}
        style={{
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: "center",
          backgroundColor: isDownloading ? "#A8C7F8" : "#3182F6",
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="download-outline" size={16} color="#FFFFFF" />
        )}
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
          {isDownloading ? "진정서 생성 중…" : "진정서 다운로드 (.doc)"}
        </Text>
      </Pressable>

      <Pressable
        onPress={onSubmit}
        style={{
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#3182F6",
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Ionicons name="open-outline" size={14} color="#3182F6" />
        <Text style={{ color: "#3182F6", fontSize: 14, fontWeight: "600" }}>
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
            <Text style={{ color: "#888888", fontSize: 13 }}>아직 안 했어요</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// ──────────────────────────────────────────
// 편집 폼 helper 컴포넌트
// ──────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      <Text
        style={{
          fontSize: 15,
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

function EditRow({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
}): JSX.Element {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: "600" }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline === true}
        keyboardType={keyboardType ?? "default"}
        textAlignVertical={multiline === true ? "top" : "center"}
        style={{
          borderWidth: 1,
          borderColor: "#CBD5E1",
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontSize: 13,
          color: "#0F172A",
          backgroundColor: "#F8FAFC",
          minHeight: multiline === true ? 120 : 40,
        }}
      />
    </View>
  );
}

function ToggleRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  selected: string | null;
  onSelect: (key: string) => void;
}): JSX.Element {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: "600" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {options.map((opt) => {
          const on = selected === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onSelect(opt.key)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: on ? "#3182F6" : "#CBD5E1",
                backgroundColor: on ? "#EBF3FF" : "#FFFFFF",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: on ? "#1A5FAF" : "#64748B",
                  fontWeight: on ? "700" : "500",
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
