import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/shared/ui";
import { useReportStore } from "@/features/report-submit";
import {
  putReportEvidence,
  type ApplicantInfo,
  type ComplaintFacts,
  type ComplaintRespondent,
  type DamageTypeEnum,
  type ReportCase,
} from "@/entities/report";
import {
  fetchContractFactSheet,
  type ContractFactSheet,
} from "@/entities/job-post";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";
import {
  emptyApplicantInfo,
  loadApplicantInfo,
  saveApplicantInfo,
} from "@/features/applicant-info";

interface EvidenceFlowViewProps {
  reportCase: ReportCase;
  onComplete: () => void;
  onBack: () => void;
}

type SubStep = "damage" | "freeform" | "complaint";

const DAMAGE_OPTIONS: Array<{ id: DamageTypeEnum; label: string }> = [
  { id: "BASE_WAGE", label: "임금(기본급) 미지급" },
  { id: "WEEKLY_HOLIDAY", label: "주휴수당 미지급" },
  { id: "OVERTIME", label: "연장근로수당 미지급" },
  { id: "NIGHT", label: "야간근로수당 미지급" },
  { id: "SEVERANCE", label: "퇴직금 미지급" },
];

const SUB_STEP_ORDER: SubStep[] = ["damage", "freeform", "complaint"];

/**
 * 1단계 신고 정보 입력 통합 컨테이너 — 3 sub-step.
 *   1-A damage    : 피해 유형 다중 선택
 *   1-B freeform  : 자연어 상황 작성 (백엔드 AI가 진정서 "내용" 자동 생성)
 *   1-C complaint : 진정인 / 피진정인 / 진정 내용 폼
 *
 * Prefill 정책:
 *   1) 진정인 정보(성명/주소/전화/주민등록번호) — AsyncStorage(ApplicantInfo)
 *   2) 피진정인 정보(사업주명/주소/연락처/대표자) + 입사일/임금지급일 — 계약서 factsheet
 *   3) 계약서 미업로드 시 → 모두 사용자 직접 입력
 *
 * 보안 정책:
 *   - 진정인 정보는 백엔드에 전송하지 않음 (PDF 생성 시점에만 메모리 사용).
 *   - PUT /reports/{id}/evidence 페이로드: damageTypes + freeFormDescription + respondent + facts.
 */
export function EvidenceFlowView({
  reportCase,
  onComplete,
  onBack,
}: EvidenceFlowViewProps): JSX.Element {
  const setDamageTypes = useReportStore((s) => s.setDamageTypes);
  const setFreeFormDescription = useReportStore(
    (s) => s.setFreeFormDescription,
  );
  const patchRespondent = useReportStore((s) => s.patchRespondent);
  const patchFacts = useReportStore((s) => s.patchFacts);
  const completeStep = useReportStore((s) => s.completeStep);
  const setCurrentStep = useReportStore((s) => s.setCurrentStep);

  /**
   * workplace 매칭으로 contractId + 캐시된 contractAnalysis 확보.
   * factsheet API 호출과 함께, 분석 직후 캐시된 ExtractedContract도 prefill 소스로 사용.
   */
  const workplace = useFavoriteWorkplaceStore((s) =>
    s.workplaces.find((w) => w.name === reportCase.workplaceName),
  );
  const contractId = workplace?.contractId;
  const cachedExtracted = workplace?.contractAnalysis?.extracted;
  const hasContract =
    contractId !== undefined || cachedExtracted !== undefined;

  const [subStep, setSubStep] = useState<SubStep>("damage");
  const subStepIdx = SUB_STEP_ORDER.indexOf(subStep);

  const [damageTypes, setLocalDamageTypes] = useState<DamageTypeEnum[]>(
    reportCase.damageTypeEnums ?? [],
  );
  const [freeForm, setFreeForm] = useState<string>(
    reportCase.freeFormDescription ?? "",
  );

  /** 진정인(나) — AsyncStorage에 한 번 저장하면 다음 사건에도 자동 prefill. */
  const [applicant, setApplicant] = useState<ApplicantInfo>(
    emptyApplicantInfo(),
  );

  /** 피진정인 — 계약서 factsheet에서 prefill, 사용자가 빈 칸 채움. */
  const [respondent, setRespondent] = useState<ComplaintRespondent>(
    reportCase.respondent ?? {
      representativeName: null,
      phone: null,
      address: null,
      businessType: "WORKPLACE",
      workplaceName: reportCase.workplaceName,
      workplacePhone: null,
      employeeCount: null,
    },
  );

  /** 진정 내용 — 계약서 prefill 가능한 필드(입사일/임금지급일) + 사용자 입력 필드. */
  const [facts, setFacts] = useState<ComplaintFacts>(
    reportCase.facts ?? {
      employmentStartDate: null,
      employmentEndDate: null,
      totalUnpaidWage: null,
      employmentStatus: null,
      unpaidSeverance: null,
      otherUnpaid: null,
      jobDescription: null,
      wagePaymentDate: null,
      contractMethod: hasContract ? "WRITTEN" : "ORAL",
    },
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 마운트 시 1회 prefill.
   * 1) ApplicantInfo (AsyncStorage) → 진정인 정보
   * 2) 캐시된 ExtractedContract → 사업주/입사일/임금지급일/업무내용/근무장소 즉시 채움
   * 3) ContractFactSheet (서버) → 캐시보다 최신값이 있으면 덮어쓰기
   *
   * 모든 단계는 실패해도 사용자 입력 fallback이 있으므로 reject는 무시.
   */
  useEffect(() => {
    void (async () => {
      try {
        const loaded = await loadApplicantInfo();
        if (loaded !== null) setApplicant(loaded);
      } catch {
        /* AsyncStorage 미사용 환경 — 무시 */
      }
    })();
    // 캐시된 분석 결과 — 즉시 prefill (네트워크 대기 없음)
    if (cachedExtracted !== undefined) {
      applyExtractedPrefill(cachedExtracted);
    }
    // 서버 factsheet — 최신값으로 덮어쓰기 (실패해도 캐시 prefill은 유지)
    if (contractId !== undefined) {
      void fetchContractFactSheet(contractId)
        .then(applyFactsheetPrefill)
        .catch(() => {
          /* factsheet 실패 — 캐시 prefill 또는 사용자 입력 fallback */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ExtractedContract (분석 직후 캐시) → store에 prefill. */
  const applyExtractedPrefill = (
    ex: NonNullable<typeof cachedExtracted>,
  ): void => {
    setRespondent((prev) => ({
      ...prev,
      representativeName:
        prev.representativeName ?? ex.employerRepresentative ?? null,
      phone: prev.phone ?? ex.employerPhone ?? null,
      address: prev.address ?? ex.employerAddress ?? ex.workPlace ?? null,
      workplaceName:
        prev.workplaceName.length > 0
          ? prev.workplaceName
          : (ex.employerName ?? reportCase.workplaceName),
      workplacePhone: prev.workplacePhone ?? ex.employerPhone ?? null,
    }));
    setFacts((prev) => ({
      ...prev,
      employmentStartDate: prev.employmentStartDate ?? ex.employmentStartDate,
      wagePaymentDate: prev.wagePaymentDate ?? ex.wagePaymentDate,
      jobDescription: prev.jobDescription ?? ex.jobDescription, // 종사할 업무 prefill
    }));
  };

  const applyFactsheetPrefill = (fs: ContractFactSheet): void => {
    setRespondent((prev) => ({
      ...prev,
      representativeName:
        prev.representativeName ?? fs.employerRepresentative ?? null,
      phone: prev.phone ?? fs.employerPhone ?? null,
      address: prev.address ?? fs.employerAddress ?? null,
      workplaceName:
        prev.workplaceName.length > 0
          ? prev.workplaceName
          : (fs.employerName ?? reportCase.workplaceName),
      workplacePhone: prev.workplacePhone ?? fs.employerPhone ?? null,
    }));
    setFacts((prev) => ({
      ...prev,
      employmentStartDate: prev.employmentStartDate ?? fs.employmentStartDate,
      wagePaymentDate: prev.wagePaymentDate ?? fs.wagePaymentDate,
    }));
  };

  const goNext = (): void => {
    if (subStep === "damage") {
      setDamageTypes(reportCase.id, damageTypes);
      setSubStep("freeform");
    } else if (subStep === "freeform") {
      setFreeFormDescription(reportCase.id, freeForm.trim());
      setSubStep("complaint");
    } else {
      // handleSubmit 자체가 throw하면 unhandled promise rejection — catch로 안전 처리
      handleSubmit().catch((err: unknown) => {
        console.error("[EvidenceFlowView] handleSubmit 실패:", err);
        setIsSubmitting(false);
        Alert.alert(
          "저장 실패",
          err instanceof Error ? err.message : "다시 시도해주세요.",
        );
      });
    }
  };

  const goPrev = (): void => {
    if (subStep === "damage") {
      onBack();
      return;
    }
    if (subStep === "freeform") setSubStep("damage");
    if (subStep === "complaint") setSubStep("freeform");
  };

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);

    // 1) 진정인 정보 AsyncStorage 저장 — 실패해도 사건 진행은 계속.
    try {
      await saveApplicantInfo(applicant);
    } catch (err) {
      console.warn("[EvidenceFlowView] applicant info 저장 실패:", err);
    }

    // 2) store에 최종 반영
    patchRespondent(reportCase.id, respondent);
    patchFacts(reportCase.id, facts);

    // 3) PUT /evidence — 백엔드 미배포 또는 통신 실패 시 사용자에게 진행 여부 묻기.
    let serverSaved = true;
    try {
      await putReportEvidence(reportCase.id, {
        damageTypes,
        freeFormDescription: freeForm.trim(),
        respondent,
        facts,
      });
    } catch (err) {
      // 서버 저장은 best-effort. 신규 신고 흐름은 클라이언트(로컬+영속) 기반이라
      // 서버 영속이 아직 없어 실패할 수 있음 → 진행을 막지 않고 조용히 로컬로 계속.
      // (진정인/진정 내용은 이미 store + AsyncStorage에 저장돼 있어 데이터 유실 없음)
      serverSaved = false;
      console.warn(
        "[EvidenceFlowView] evidence 서버 저장 실패(로컬 보존, 계속 진행):",
        err instanceof Error ? err.message : err,
      );
    }

    setIsSubmitting(false);
    completeStep(reportCase.id, "evidence_collection");
    setCurrentStep(reportCase.id, "complaint_draft");
    if (!serverSaved) {
      console.warn(
        "[EvidenceFlowView] 서버 저장 실패 상태로 다음 단계 진행 — 재전송 로직 필요 시 별도 처리",
      );
    }
    onComplete();
  };

  const canGoNext = (() => {
    if (subStep === "damage") return damageTypes.length > 0;
    if (subStep === "freeform") return freeForm.trim().length >= 10;
    // 1-C 진정 내용 필수 조건:
    //   - 진정인: 성명·주소·휴대전화·주민등록번호
    //   - 진정 내용: 입사일·재직여부·체불임금 총액
    //   - 퇴직 시 퇴사일
    //   - SEVERANCE 선택 시 체불 퇴직금
    //   - WEEKLY_HOLIDAY/OVERTIME/NIGHT 선택 시 기타 체불금
    const applicantOk =
      applicant.fullName.trim().length > 0 &&
      applicant.address.trim().length > 0 &&
      applicant.mobile.trim().length > 0 &&
      applicant.rrn.trim().length > 0;
    const respondentOk =
      respondent.workplaceName.trim().length > 0 &&
      (respondent.address ?? "").trim().length > 0;
    const factsOk =
      facts.employmentStartDate !== null &&
      facts.totalUnpaidWage !== null &&
      facts.employmentStatus !== null &&
      (facts.employmentStatus !== "FORMER" ||
        facts.employmentEndDate !== null);
    const severanceOk =
      !damageTypes.includes("SEVERANCE") || facts.unpaidSeverance !== null;
    const otherOk =
      !damageTypes.some((d) =>
        ["WEEKLY_HOLIDAY", "OVERTIME", "NIGHT"].includes(d),
      ) || facts.otherUnpaid !== null;
    return applicantOk && respondentOk && factsOk && severanceOk && otherOk;
  })();

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
        <Pressable onPress={goPrev} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: "#94A3B8" }}>신고 정보 입력</Text>
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}
          >
            {reportCase.workplaceName}
          </Text>
        </View>
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
        {SUB_STEP_ORDER.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === subStepIdx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= subStepIdx ? "#3182F6" : "#E2E8F0",
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
          {`${subStepIdx + 1} / ${SUB_STEP_ORDER.length}`}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {subStep === "damage" ? (
          <DamageStep
            selected={damageTypes}
            onToggle={(id) =>
              setLocalDamageTypes((prev) =>
                prev.includes(id)
                  ? prev.filter((x) => x !== id)
                  : [...prev, id],
              )
            }
          />
        ) : subStep === "freeform" ? (
          <FreeFormStep value={freeForm} onChange={setFreeForm} />
        ) : (
          <ComplaintStep
            applicant={applicant}
            respondent={respondent}
            facts={facts}
            damageTypes={damageTypes}
            hasContract={hasContract}
            onPatchApplicant={(patch) =>
              setApplicant((prev) => ({ ...prev, ...patch }))
            }
            onPatchRespondent={(patch) =>
              setRespondent((prev) => ({ ...prev, ...patch }))
            }
            onPatchFacts={(patch) =>
              setFacts((prev) => ({ ...prev, ...patch }))
            }
          />
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
          backgroundColor: "#F8FAFC",
        }}
      >
        <Pressable
          onPress={goPrev}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: "#F1F5F9",
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <Text
            style={{ fontSize: 14, color: "#475569", fontWeight: "600" }}
          >
            {subStep === "damage" ? "취소" : "이전"}
          </Text>
        </Pressable>
        <Pressable
          onPress={goNext}
          disabled={!canGoNext || isSubmitting}
          style={{
            flex: 2,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: canGoNext ? "#3182F6" : "#CBD5E1",
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
            {subStep === "complaint"
              ? isSubmitting
                ? "저장 중..."
                : "신고 정보 저장하기"
              : "다음"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────
// 1-A 피해 유형
// ──────────────────────────────────────

function DamageStep({
  selected,
  onToggle,
}: {
  selected: DamageTypeEnum[];
  onToggle: (id: DamageTypeEnum) => void;
}): JSX.Element {
  return (
    <>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 4,
        }}
      >
        피해 유형을 선택하세요
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: "#64748B",
          marginBottom: 24,
        }}
      >
        해당하는 항목을 모두 선택해주세요 (다중 선택)
      </Text>

      <View style={{ gap: 8 }}>
        {DAMAGE_OPTIONS.map((opt) => {
          const isActive = selected.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              onPress={() => onToggle(opt.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isActive ? "#3182F6" : "#E2E8F0",
                backgroundColor: isActive ? "#EBF3FF" : "#FFFFFF",
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: isActive ? "#3182F6" : "#CBD5E1",
                  backgroundColor: isActive ? "#3182F6" : "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isActive ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : null}
              </View>
              <Text
                style={{
                  fontSize: 15,
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
    </>
  );
}

// ──────────────────────────────────────
// 1-B 자연어 상황 작성
// ──────────────────────────────────────

function FreeFormStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  const MAX = 1000;
  return (
    <>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 4,
        }}
      >
        상황을 자유롭게 적어주세요
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: "#64748B",
          marginBottom: 20,
          lineHeight: 19,
        }}
      >
        {
          "어떤 일이 있었는지 자세히 적어주시면\n진정서 작성과 멘토 매칭에 큰 도움이 됩니다."
        }
      </Text>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          padding: 14,
        }}
      >
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.slice(0, MAX))}
          multiline
          maxLength={MAX}
          placeholder={
            "예시: 작년 12월부터 시급으로 일했는데 3개월간 주휴수당을 한 번도 받지 못했습니다. 사장님은 '주 15시간 미만이라 안 줘도 된다'고 하셨지만 실제로 주 25시간씩 일했습니다. ..."
          }
          placeholderTextColor="#94A3B8"
          style={{
            fontSize: 14,
            color: "#0F172A",
            minHeight: 200,
            textAlignVertical: "top",
            padding: 0,
            lineHeight: 21,
          }}
        />
        <Text
          style={{
            fontSize: 11,
            color: "#94A3B8",
            textAlign: "right",
            marginTop: 8,
          }}
        >
          {`${value.length} / ${MAX}자 · 최소 10자`}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#FFFBEB",
          borderRadius: 10,
          padding: 12,
          marginTop: 12,
          flexDirection: "row",
          gap: 6,
          alignItems: "flex-start",
        }}
      >
        <Ionicons
          name="bulb"
          size={14}
          color="#B45309"
          style={{ marginTop: 1 }}
        />
        <Text
          style={{ flex: 1, fontSize: 11, color: "#92400E", lineHeight: 17 }}
        >
          {
            "근무 기간, 시급, 미지급 금액, 사장님과의 대화 등이 들어가면 더 정확해요. 이 내용을 바탕으로 AI가 진정서의 '업무 내용'과 '내용(사실관계 서술)'을 자동 생성합니다."
          }
        </Text>
      </View>
    </>
  );
}

// ──────────────────────────────────────
// 1-C 진정 내용 (진정인 + 피진정인 + 진정 내용)
// ──────────────────────────────────────

interface ComplaintStepProps {
  applicant: ApplicantInfo;
  respondent: ComplaintRespondent;
  facts: ComplaintFacts;
  damageTypes: DamageTypeEnum[];
  hasContract: boolean;
  onPatchApplicant: (patch: Partial<ApplicantInfo>) => void;
  onPatchRespondent: (patch: Partial<ComplaintRespondent>) => void;
  onPatchFacts: (patch: Partial<ComplaintFacts>) => void;
}

function ComplaintStep({
  applicant,
  respondent,
  facts,
  damageTypes,
  hasContract,
  onPatchApplicant,
  onPatchRespondent,
  onPatchFacts,
}: ComplaintStepProps): JSX.Element {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);

  const needsSeverance = damageTypes.includes("SEVERANCE");
  const needsOther = damageTypes.some((d) =>
    ["WEEKLY_HOLIDAY", "OVERTIME", "NIGHT"].includes(d),
  );

  return (
    <>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 4,
        }}
      >
        진정 내용을 채워주세요
      </Text>
      <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
        진정서에 들어갈 핵심 정보를 입력해주세요
      </Text>

      {hasContract ? (
        <View
          style={{
            backgroundColor: "#EBF3FF",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            flexDirection: "row",
            gap: 6,
            alignItems: "flex-start",
            borderWidth: 1,
            borderColor: "#B5D4F4",
          }}
        >
          <Ionicons
            name="document-text"
            size={14}
            color="#185FA5"
            style={{ marginTop: 1 }}
          />
          <Text
            style={{ flex: 1, fontSize: 12, color: "#185FA5", lineHeight: 18 }}
          >
            계약서에서 추출한 정보로 일부 칸을 미리 채웠습니다. 다른 부분이 있다면 수정해주세요.
          </Text>
        </View>
      ) : null}

      {/* 진정인(나) */}
      <SectionHeader title="진정인 (본인)" />
      <View
        style={{
          backgroundColor: "#FFFBEB",
          borderRadius: 10,
          padding: 10,
          marginBottom: 10,
          flexDirection: "row",
          gap: 6,
          alignItems: "flex-start",
        }}
      >
        <Ionicons
          name="lock-closed"
          size={12}
          color="#92400E"
          style={{ marginTop: 1 }}
        />
        <Text
          style={{ flex: 1, fontSize: 11, color: "#92400E", lineHeight: 16 }}
        >
          이 정보는 이 기기에만 저장됩니다 (서버 전송 X). 다음 사건부터 자동으로 채워져요.
        </Text>
      </View>

      <LabeledTextInput
        label="성명"
        required
        value={applicant.fullName}
        onChange={(v) => onPatchApplicant({ fullName: v })}
        placeholder="예: 홍길동"
      />
      <LabeledTextInput
        label="주소 (송달용)"
        required
        value={applicant.address}
        onChange={(v) => onPatchApplicant({ address: v })}
        placeholder="예: 서울 강남구 ..."
      />
      <LabeledTextInput
        label="휴대전화"
        required
        value={applicant.mobile}
        onChange={(v) => onPatchApplicant({ mobile: v })}
        placeholder="010-1234-5678"
        keyboardType="phone-pad"
      />
      <LabeledTextInput
        label="주민등록번호"
        required
        value={applicant.rrn}
        onChange={(v) => onPatchApplicant({ rrn: v })}
        placeholder="000000-0000000"
      />

      {/* 피진정인(사업주) */}
      <View style={{ height: 18 }} />
      <SectionHeader title="피진정인 (사업주)" />

      <LabeledTextInput
        label="사업장명"
        required
        value={respondent.workplaceName}
        onChange={(v) => onPatchRespondent({ workplaceName: v })}
        placeholder="예: OO카페 강남점"
      />
      <LabeledTextInput
        label="사업장 주소 (실근무 장소)"
        required
        value={respondent.address ?? ""}
        onChange={(v) => onPatchRespondent({ address: v.trim() || null })}
        placeholder="관할 노동청이 자동 결정되는 칸이에요"
      />
      <LabeledTextInput
        label="사업장 연락처"
        value={respondent.workplacePhone ?? ""}
        onChange={(v) =>
          onPatchRespondent({ workplacePhone: v.trim() || null })
        }
        placeholder="02-1234-5678 (선택)"
        keyboardType="phone-pad"
      />
      <LabeledTextInput
        label="대표자 성명"
        value={respondent.representativeName ?? ""}
        onChange={(v) =>
          onPatchRespondent({ representativeName: v.trim() || null })
        }
        placeholder={
          hasContract
            ? "계약서에서 자동으로 가져와요"
            : "모르면 비워두세요 (있으면 입력)"
        }
      />

      {/* 진정 내용 */}
      <View style={{ height: 18 }} />
      <SectionHeader title="진정 내용" />

      {/* 입사일 (계약서 prefill 가능, 사용자 편집 가능) */}
      <DateRow
        label="입사일"
        required
        value={facts.employmentStartDate}
        onPress={() => setShowStartPicker(true)}
      />
      {showStartPicker ? (
        <DateTimePicker
          value={
            facts.employmentStartDate !== null
              ? parseDateIso(facts.employmentStartDate)
              : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, d) => {
            if (Platform.OS === "android") setShowStartPicker(false);
            if (d !== undefined) {
              onPatchFacts({ employmentStartDate: formatDateIso(d) });
            }
          }}
        />
      ) : null}

      {/* 재직 / 퇴직 */}
      <Text
        style={{
          fontSize: 13,
          color: "#475569",
          fontWeight: "600",
          marginTop: 10,
          marginBottom: 6,
        }}
      >
        {"재직 여부 "}
        <Text style={{ color: "#DC2626" }}>*</Text>
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(
          [
            ["CURRENT", "재직 중"],
            ["FORMER", "퇴직"],
          ] as const
        ).map(([id, label]) => {
          const active = facts.employmentStatus === id;
          return (
            <Pressable
              key={id}
              onPress={() => onPatchFacts({ employmentStatus: id })}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: active ? "#3182F6" : "#FFFFFF",
                borderWidth: 1,
                borderColor: active ? "#3182F6" : "#E2E8F0",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: active ? "#FFFFFF" : "#475569",
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {facts.employmentStatus === "FORMER" ? (
        <>
          <DateRow
            label="퇴사일"
            required
            value={facts.employmentEndDate}
            onPress={() => setShowEndPicker(true)}
          />
          {showEndPicker ? (
            <DateTimePicker
              value={
                facts.employmentEndDate !== null
                  ? parseDateIso(facts.employmentEndDate)
                  : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, d) => {
                if (Platform.OS === "android") setShowEndPicker(false);
                if (d !== undefined) {
                  onPatchFacts({ employmentEndDate: formatDateIso(d) });
                }
              }}
            />
          ) : null}
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 8,
              padding: 10,
              marginTop: 4,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 11, color: "#92400E", lineHeight: 16 }}>
              퇴직자는 퇴직일로부터 14일 이내 미지급분이 체불로 기산됩니다.
            </Text>
          </View>
        </>
      ) : null}

      {/* 임금 지급일 (계약서 prefill 가능) */}
      <View style={{ height: 6 }} />
      <DateRow
        label="임금 정기 지급일"
        value={facts.wagePaymentDate}
        onPress={() => setShowPaymentDatePicker(true)}
      />
      {showPaymentDatePicker ? (
        <DateTimePicker
          value={
            facts.wagePaymentDate !== null
              ? parseDateIso(facts.wagePaymentDate)
              : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, d) => {
            if (Platform.OS === "android") setShowPaymentDatePicker(false);
            if (d !== undefined) {
              onPatchFacts({ wagePaymentDate: formatDateIso(d) });
            }
          }}
        />
      ) : null}

      {/* 체불 금액 */}
      <View style={{ height: 6 }} />
      <LabeledNumberInput
        label="체불임금 총액 (실제로 못 받은 금액)"
        required
        value={facts.totalUnpaidWage}
        onChange={(n) => onPatchFacts({ totalUnpaidWage: n })}
        placeholder="예: 1200000"
        suffix="원"
      />
      {needsSeverance ? (
        <LabeledNumberInput
          label="체불 퇴직금"
          required
          value={facts.unpaidSeverance}
          onChange={(n) => onPatchFacts({ unpaidSeverance: n })}
          placeholder="퇴직금 미지급액"
          suffix="원"
        />
      ) : null}
      {needsOther ? (
        <LabeledNumberInput
          label="기타 체불금 (주휴/연장/야간수당 합계)"
          required
          value={facts.otherUnpaid}
          onChange={(n) => onPatchFacts({ otherUnpaid: n })}
          placeholder="해당 수당 미지급액 합계"
          suffix="원"
        />
      ) : null}

      {/* 처리결과 수신 동의 */}
      <View style={{ height: 14 }} />
      <ToggleRow
        label="처리 결과를 SMS·이메일로 받기 (권장)"
        value={applicant.wantsResultNotice}
        onChange={(v) => onPatchApplicant({ wantsResultNotice: v })}
      />

      <View
        style={{
          backgroundColor: "#EBF3FF",
          borderRadius: 10,
          padding: 12,
          marginTop: 18,
          flexDirection: "row",
          gap: 6,
          alignItems: "flex-start",
        }}
      >
        <Ionicons
          name="information-circle"
          size={14}
          color="#1A5FAF"
          style={{ marginTop: 1 }}
        />
        <Text
          style={{ flex: 1, fontSize: 11, color: "#185FA5", lineHeight: 17 }}
        >
          {hasContract
            ? "근로계약 방법(서면)·관할 노동지청은 계약서 정보를 기반으로 자동 처리됩니다. 업무 내용·사실관계 서술은 앞서 작성한 자연어를 AI가 진정서 양식에 맞춰 생성합니다."
            : "근로계약서가 없어도 진정 접수가 가능합니다. 업무 내용·사실관계 서술은 앞서 작성한 자연어를 AI가 진정서 양식에 맞춰 생성합니다."}
        </Text>
      </View>
    </>
  );
}

// ──────────────────────────────────────
// 공통 입력 helpers
// ──────────────────────────────────────

function SectionHeader({ title }: { title: string }): JSX.Element {
  return (
    <Text
      style={{
        fontSize: 14,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 10,
        marginTop: 4,
      }}
    >
      {title}
    </Text>
  );
}

function LabeledTextInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "numeric";
}): JSX.Element {
  return (
    <View style={{ marginBottom: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 6,
        }}
      >
        <Text
          style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}
        >
          {label}
        </Text>
        {required === true ? (
          <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "600" }}>
            *
          </Text>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType ?? "default"}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 14,
          color: "#0F172A",
        }}
      />
    </View>
  );
}

function LabeledNumberInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  required?: boolean;
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder: string;
  suffix: string;
}): JSX.Element {
  const [text, setText] = useState<string>(value !== null ? String(value) : "");
  return (
    <View style={{ marginBottom: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 6,
        }}
      >
        <Text
          style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}
        >
          {label}
        </Text>
        {required === true ? (
          <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "600" }}>
            *
          </Text>
        ) : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          paddingHorizontal: 12,
        }}
      >
        <TextInput
          value={text}
          onChangeText={(v) => {
            const cleaned = v.replace(/[^0-9]/g, "");
            setText(cleaned);
            const n = parseInt(cleaned, 10);
            onChange(Number.isFinite(n) && n > 0 ? n : null);
          }}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={{
            flex: 1,
            fontSize: 14,
            color: "#0F172A",
            paddingVertical: 12,
          }}
        />
        <Text style={{ fontSize: 13, color: "#64748B" }}>{suffix}</Text>
      </View>
    </View>
  );
}

function DateRow({
  label,
  required,
  value,
  onPress,
}: {
  label: string;
  required?: boolean;
  value: string | null;
  onPress: () => void;
}): JSX.Element {
  return (
    <View style={{ marginBottom: 8, marginTop: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 6,
        }}
      >
        <Text
          style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}
        >
          {label}
        </Text>
        {required === true ? (
          <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "600" }}>
            *
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FFFFFF",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          paddingHorizontal: 12,
          paddingVertical: 12,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: value !== null ? "#0F172A" : "#94A3B8",
          }}
        >
          {value ?? "날짜 선택"}
        </Text>
        <Ionicons name="calendar" size={16} color="#94A3B8" />
      </Pressable>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      <Text style={{ fontSize: 13, color: "#0F172A", flex: 1, paddingRight: 8 }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#CBD5E1", true: "#3182F6" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function parseDateIso(value: string): Date {
  const [y, m, d] = value.split("-").map((s) => parseInt(s, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date();
  }
  return new Date(y, m - 1, d);
}

function formatDateIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}
