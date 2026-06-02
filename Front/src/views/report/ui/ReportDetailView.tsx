import { useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useReportStore } from "@/features/report-submit";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { router } from "expo-router";
import { MentorRecommendView } from "./MentorRecommendView";
import { SmartMentorRecommendView } from "./SmartMentorRecommendView";
import {
  amountToRange,
  inferBusinessSize,
  mapDamageTypeLabelsToCode,
  mapIndustryLabelToCode,
  mapRegionLabelToCode,
} from "./report-case-mapper";
import { useMentorMatchStore } from "@/features/mentor-match";
import { ReportDraftWizardView } from "./ReportDraftWizardView";
import { ResolveConfirmView } from "./ResolveConfirmView";
import { SubmissionResultView } from "./SubmissionResultView";
import { ResolveSuccessView } from "./ResolveSuccessView";
import { ReviewWriteView } from "./ReviewWriteView";
import { EvidenceFlowView } from "./EvidenceFlowView";
import { MentorBrowseView } from "./MentorBrowseView";
import { MentorQuickMatchModal } from "./MentorQuickMatchModal";
import type { DamageTypeEnum } from "@/entities/report";
import {
  STEP_ORDER,
  STEP_META,
  type CaseStep,
  type InvestigationSubStatus,
  type ReportStatus,
} from "@/entities/report";

interface ReportDetailViewProps {
  caseId: string;
  onBack: () => void;
}

const STATUS_BADGE: Record<
  ReportStatus,
  { label: string; bg: string; color: string }
> = {
  PENDING: { label: "접수 대기", bg: "#F1F5F9", color: "#475569" },
  INSPECTING: { label: "조사 중", bg: "#E8F2FF", color: "#1B64DA" },
  CORRECTION_ORDERED: {
    label: "시정 명령",
    bg: "#FEF3C7",
    color: "#92400E",
  },
  RESOLVED: { label: "해결 완료", bg: "#DCFCE7", color: "#15803D" },
  UNRESOLVED: { label: "미해결", bg: "#FEE2E2", color: "#991B1B" },
};

interface TaskAction {
  label: string;
  onPress: () => void;
}

interface CurrentTask {
  title: string;
  description: string;
  primary?: TaskAction;
  secondary?: TaskAction;
  secondaryDisclaimer?: string;
}

interface TaskHandlers {
  onAdvance: () => void;
  onConnectMentor: () => void;
  onOpenWork24: () => void;
  onStartDraft: () => void;
  /** V2 — 1-A/1-B/1-C 신고 정보 입력 흐름 진입. */
  onStartEvidenceFlow: () => void;
  onOpenResolveConfirm: () => void;
  /** Step 6 (investigation) 서브 상태. 제출 직후 자동 'waiting_inspector'. */
  investigationStatus?: InvestigationSubStatus;
}

/**
 * 6단계별 "지금 해야 할 일" 콘텐츠.
 * complaint_draft / investigation은 멘토 진입점 (secondary 버튼).
 */
function getCurrentTaskByStep(
  step: CaseStep,
  handlers: TaskHandlers,
): CurrentTask {
  switch (step) {
    case "evidence_collection":
      return {
        title: "신고 정보를 입력해주세요",
        description:
          "피해 유형 → 상황 설명 → 진정 내용을 차례대로 작성하면 다음 단계로 넘어가요",
        primary: {
          label: "신고 정보 입력 시작하기 →",
          onPress: handlers.onStartEvidenceFlow,
        },
      };
    case "complaint_draft":
      return {
        title: "진정서 초안을 작성할 차례예요",
        description: "진정서 작성이 막막하다면 멘토와 함께 시작하세요",
        primary: {
          label: "진정서 작성 시작 →",
          onPress: handlers.onStartDraft,
        },
        secondary: {
          label: "멘토와 함께 작성하기 · ₩10,000",
          onPress: handlers.onConnectMentor,
        },
        secondaryDisclaimer: "멘토는 동료 근로자입니다. 법률 자문 아님.",
      };
    case "submission":
      return {
        title: "진정서를 노동청에 제출하세요",
        description: "고용24 또는 관할 고용노동청에 직접 제출",
        primary: {
          label: "고용24 바로가기 →",
          onPress: handlers.onOpenWork24,
        },
      };
    case "investigation": {
      const sub = handlers.investigationStatus ?? "waiting_inspector";
      switch (sub) {
        case "waiting_inspector":
          return {
            title: "근로감독관 배정을 기다리는 중이에요",
            description:
              "보통 1~2주 안에 담당 감독관이 배정됩니다. 출석요구서를 받으면 알려주세요",
            secondary: {
              label: "출석조사 멘토 미리 연결 · ₩10,000",
              onPress: handlers.onConnectMentor,
            },
            secondaryDisclaimer: "멘토는 동료 근로자입니다. 법률 자문 아님.",
          };
        case "awaiting_hearing":
          return {
            title: "출석조사를 준비하세요",
            description:
              "지정된 날짜에 노동청에 출석해 조사를 받습니다. 멘토와 함께 준비할 수 있어요",
            primary: {
              label: "출석조사 멘토 연결 · ₩10,000",
              onPress: handlers.onConnectMentor,
            },
            secondaryDisclaimer: "멘토는 동료 근로자입니다. 법률 자문 아님.",
          };
        case "under_correction":
          return {
            title: "시정지시가 발부되었어요",
            description:
              "사업주가 지급할 때까지 기다리세요. 입금을 확인하면 해결로 처리해주세요",
            primary: {
              label: "돈을 받았어요 (해결 확인)",
              onPress: handlers.onOpenResolveConfirm,
            },
          };
        case "resolved_confirm":
          return {
            title: "해결 확인이 필요해요",
            description: "최종 해결 처리를 완료하시면 후기를 남길 수 있어요",
            primary: {
              label: "해결 확인 완료하기",
              onPress: handlers.onOpenResolveConfirm,
            },
          };
      }
    }
  }
}

export function ReportDetailView({
  caseId,
  onBack,
}: ReportDetailViewProps): JSX.Element | null {
  const reportCase = useReportStore((s) =>
    s.cases.find((c) => c.id === caseId),
  );
  const advanceStep = useReportStore((s) => s.advanceStep);
  const closeCase = useReportStore((s) => s.closeCase);
  const updateInvestigationStatus = useReportStore(
    (s) => s.updateInvestigationStatus,
  );
  const updateCaseStatus = useReportStore((s) => s.updateCaseStatus);
  const navigateToStep = useReportStore((s) => s.navigateToStep);
  const userId = useAuthStore((s) => s.userIdString);
  const [showMentorRecommend, setShowMentorRecommend] = useState(false);
  const [showSmartMentor, setShowSmartMentor] = useState(false);
  /** 멘토 둘러보기/더보기 — MentorBrowseView 오버레이 */
  const [showMentorBrowse, setShowMentorBrowse] = useState(false);
  /** BrowseView에서 멘토 선택 시 결제 모달 진입용 */
  const [browsedMentorId, setBrowsedMentorId] = useState<string | null>(null);
  const [showDraftWizard, setShowDraftWizard] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [showSubmissionResult, setShowSubmissionResult] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  /** Step 6 사건 진행 상태 업데이트 박스 — 인라인 예/아니오 확인 대기 중인 항목. */
  const [pendingInvestigationStatus, setPendingInvestigationStatus] =
    useState<InvestigationSubStatus | null>(null);
  const createMentorMatch = useMentorMatchStore((s) => s.createMatch);
  const caseMentorMatches = useMentorMatchStore((s) =>
    s.matches.filter(
      (m) => m.caseId === reportCase?.id && m.status === "active",
    ),
  );
  const [showResolveSuccess, setShowResolveSuccess] = useState(false);
  const [showReviewWrite, setShowReviewWrite] = useState(false);
  /** V2 신고 정보 입력 흐름 (1-A 피해유형 / 1-B 자유서술 / 1-C 진정내용) */
  const [showEvidenceFlow, setShowEvidenceFlow] = useState(false);

  if (reportCase === undefined) {
    return null;
  }

  if (showEvidenceFlow) {
    return (
      <EvidenceFlowView
        reportCase={reportCase}
        onBack={() => setShowEvidenceFlow(false)}
        onComplete={() => {
          setShowEvidenceFlow(false);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }}
      />
    );
  }

  if (showMentorBrowse) {
    /**
     * 둘러보기/더보기 진입 — prefill 정책:
     *   - 1단계(evidence_collection) "전체 멘토 둘러보기": 사건 정보 부족 + 사용자 의도가 "전체 보기" →
     *     prefill 안 보냄, 모든 멘토 노출.
     *   - 2단계 이후 "멘토 더보기": 사건 컨텍스트 prefill (industry/damageTypes/region).
     */
    const isBrowsingBeforeInput =
      reportCase.currentStep === "evidence_collection";
    const damageEnums: DamageTypeEnum[] = reportCase.damageTypeEnums ?? [];
    return (
      <MentorBrowseView
        initialIndustry={
          isBrowsingBeforeInput ? undefined : reportCase.industry
        }
        initialDamageTypes={isBrowsingBeforeInput ? undefined : damageEnums}
        initialRegion={isBrowsingBeforeInput ? undefined : reportCase.region}
        onBack={() => setShowMentorBrowse(false)}
        onSelect={(mentor) => {
          setShowMentorBrowse(false);
          setBrowsedMentorId(mentor.userId);
        }}
      />
    );
  }

  if (showSmartMentor) {
    const industryCode = mapIndustryLabelToCode(reportCase.industry);
    return (
      <SmartMentorRecommendView
        caseId={Number(reportCase.id) || null}
        industry={industryCode}
        damageTypes={mapDamageTypeLabelsToCode(reportCase.damageTypes)}
        businessSize={inferBusinessSize(industryCode)}
        region={mapRegionLabelToCode(reportCase.region)}
        damageAmountRange={amountToRange(reportCase.calculatedUnpaid ?? 0)}
        description={
          reportCase.calculatedUnpaid !== null && reportCase.calculatedUnpaid > 0
            ? `${reportCase.workplaceName} - 미지급 ${reportCase.calculatedUnpaid.toLocaleString()}원`
            : reportCase.workplaceName
        }
        onBack={() => setShowSmartMentor(false)}
        onMatched={(_matchId, _mentorNickname) => {
          setShowSmartMentor(false);
          // 채팅 진입은 SmartMentorRecommendView 내부에서 router.push로 직접 처리
        }}
        onOpenBrowse={() => {
          // Top-3에 마음에 드는 멘토 없을 때 → 전체 멘토 둘러보기로 전환
          setShowSmartMentor(false);
          setShowMentorBrowse(true);
        }}
      />
    );
  }

  if (showMentorRecommend) {
    return (
      <MentorRecommendView
        caseId={reportCase.id}
        industry={reportCase.industry}
        damageTypes={reportCase.damageTypes}
        onBack={() => setShowMentorRecommend(false)}
        onStartChat={(mentor) => {
          // 매칭 레코드 생성 + 최상위 라우트로 채팅 진입 (탭 무관 영구 접근).
          const match = createMentorMatch({
            caseId: reportCase.id,
            menteeId: userId,
            mentorId: mentor.userId,
            mentorNickname: mentor.nickname,
            mentorBadges: mentor.badges,
            mentorIndustry: mentor.industry,
          });
          setShowMentorRecommend(false);
          // 채팅에서 돌아올 때 ReportView가 list로 리셋되지 않도록 플래그 설정
          useReportStore.getState().setShouldSkipNextFocusReset(true);
          router.push(`/mentor-chat/${match.id}`);
        }}
      />
    );
  }

  if (showDraftWizard) {
    return (
      <ReportDraftWizardView
        reportCase={reportCase}
        onBack={() => setShowDraftWizard(false)}
        onSubmitted={() => {
          setShowDraftWizard(false);
          setShowSubmissionResult(true);
        }}
      />
    );
  }

  if (showSubmissionResult) {
    return (
      <SubmissionResultView
        caseId={reportCase.id}
        onGoCaseDetail={() => setShowSubmissionResult(false)}
        onConnectMentor={() => {
          setShowSubmissionResult(false);
          setShowSmartMentor(true); // AI 매칭 시스템 진입
        }}
      />
    );
  }

  if (showReviewWrite) {
    return (
      <ReviewWriteView
        resolvedCase={reportCase}
        onBack={() => setShowReviewWrite(false)}
      />
    );
  }

  if (showResolveSuccess) {
    return (
      <ResolveSuccessView
        caseId={reportCase.id}
        onWriteReview={() => {
          setShowResolveSuccess(false);
          setShowReviewWrite(true);
        }}
        onSkip={() => setShowResolveSuccess(false)}
      />
    );
  }

  if (showResolveConfirm) {
    return (
      <ResolveConfirmView
        caseId={reportCase.id}
        onBack={() => setShowResolveConfirm(false)}
        onAfterResolved={() => {
          setShowResolveConfirm(false);
          setShowResolveSuccess(true);
        }}
      />
    );
  }

  const currentStep: CaseStep = reportCase.currentStep;
  const currentStepIdx = STEP_ORDER.indexOf(currentStep);
  const progressPercent = Math.round(
    ((currentStepIdx + 1) / STEP_ORDER.length) * 100,
  );
  const progressWidth: `${number}%` = `${progressPercent}%`;
  const badge = STATUS_BADGE[reportCase.status];

  const handleAdvance = (): void => {
    // Alert 없이 즉시 진행 — "혼자 진행할게요" / "다음 단계로 (진정서 작성)" 모두 같은 핸들러.
    advanceStep(reportCase.id);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleConnectMentor = (): void => {
    // 메인 매칭 흐름은 AI 시스템 (Gower + Gale-Shapley + Thompson Sampling)
    setShowSmartMentor(true);
  };

  const handleOpenWork24 = (): void => {
    Alert.alert(
      "외부 사이트 이동",
      "고용24(work24.go.kr)로 이동하시겠어요?",
      [
        { text: "취소" },
        {
          text: "이동",
          onPress: () => {
            void Linking.openURL("https://www.work24.go.kr/");
          },
        },
      ],
    );
  };

  const handleStartDraft = (): void => {
    setShowDraftWizard(true);
  };

  /**
  /**
   * 진행 단계 리스트/네비게이터에서 호출. Alert 없이 즉시 이동.
   * 이전 단계로 가도 입력 데이터/amountCalcState는 그대로 유지 (변경 안 함).
   * "금액이 다른 것 같아요" 버튼 등 명시적 사용자 액션만 데이터를 리셋.
   */
  const handleNavigateToStep = (targetStep: CaseStep): void => {
    const targetIdx = STEP_ORDER.indexOf(targetStep);
    const curIdx = STEP_ORDER.indexOf(reportCase.currentStep);
    if (targetIdx === curIdx) return;
    navigateToStep(reportCase.id, targetStep);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const currentTask = getCurrentTaskByStep(currentStep, {
    onAdvance: handleAdvance,
    onConnectMentor: handleConnectMentor,
    onOpenWork24: handleOpenWork24,
    onStartDraft: handleStartDraft,
    onStartEvidenceFlow: () => setShowEvidenceFlow(true),
    onOpenResolveConfirm: () => setShowResolveConfirm(true),
    investigationStatus: reportCase.investigationStatus,
  });

  const handleClose = (): void => {
    Alert.alert(
      "신고 취하",
      "정말 신고를 취하하시겠습니까? 이미 노동청에 제출된 신고는 별도 절차가 필요합니다.",
      [
        { text: "아니오" },
        {
          text: "신고 취하",
          style: "destructive",
          onPress: () => {
            closeCase(reportCase.id);
            onBack();
          },
        },
      ],
    );
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
            {reportCase.workplaceName}
          </Text>
          <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
            {`신고 ID: ${reportCase.id}`}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: badge.bg,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: badge.color,
            }}
          >
            {badge.label}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
      >
        {/* 미지급 금액 + 진행률 */}
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
              fontSize: 12,
              fontWeight: "600",
              color: "#3182F6",
              marginBottom: 6,
            }}
          >
            {`${currentStepIdx + 1}/${STEP_ORDER.length} 단계`}
          </Text>
          <View
            style={{
              height: 8,
              backgroundColor: "#F1F5F9",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 8,
                width: progressWidth,
                backgroundColor: "#3182F6",
              }}
            />
          </View>
        </View>


        {/* 지금 해야 할 일 — V2: evidence_collection 단계는 일반 currentTask 카드로 통일.
            (수정 모드 배너는 진행 단계 카드 상단의 StepNavigator로 대체됨) */}
        {currentStep === "investigation" &&
          reportCase.status === "RESOLVED" ? (
          <View
            style={{
              backgroundColor: "#EAF3DE",
              borderColor: "#C0DD97",
              borderWidth: 1,
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
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 22 }}>✅</Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#3B6D11" }}
              >
                사건이 해결되었습니다!
              </Text>
            </View>
            <Text
              style={{ fontSize: 13, color: "#555555", marginBottom: 4 }}
            >
              {`해결일: ${reportCase.resolvedAt?.slice(0, 10) ?? "-"}`}
            </Text>
            {reportCase.calculatedUnpaid !== null ? (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#3B6D11",
                  marginBottom: 12,
                }}
              >
                {`수령 완료: ₩${reportCase.calculatedUnpaid.toLocaleString()}`}
              </Text>
            ) : null}
            {reportCase.hasWrittenReview !== true ? (
              <Pressable
                onPress={() => setShowReviewWrite(true)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#3B6D11",
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#3B6D11",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  ✍️ 경험 후기 남기기
                </Text>
              </Pressable>
            ) : (
              <Text
                style={{
                  fontSize: 12,
                  color: "#3B6D11",
                  fontWeight: "600",
                }}
              >
                ✓ 후기가 등록되었어요. 감사합니다!
              </Text>
            )}
          </View>
        ) : currentStep === "investigation" &&
          reportCase.status === "UNRESOLVED" ? (
          <View
            style={{
              backgroundColor: "#FEECEC",
              borderColor: "#F7C1C1",
              borderWidth: 1,
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#C0392B",
                marginBottom: 8,
              }}
            >
              🔴 아직 임금을 받지 못하셨군요
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#555555",
                lineHeight: 19,
                marginBottom: 12,
              }}
            >
              시정지시 미이행 시 형사입건이 가능합니다. 아래 안내된 다음
              단계를 진행해주세요.
            </Text>
            <Pressable
              onPress={() =>
                Alert.alert(
                  "다음 단계 안내",
                  "1) 체불 임금등·사업주 확인서 발급 (관할 고용노동관서)\n2) 대한법률구조공단 민사소송 (평균임금 400만원 미만 무료)\n3) 대지급금 제도 (사업주 도산 등)\n\n자세한 안내 화면은 곧 출시됩니다.",
                )
              }
              style={{
                backgroundColor: "#C0392B",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
              >
                다음 단계 안내 보기
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#FCD34D",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Ionicons name="flag" size={16} color="#92400E" />
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: "#92400E" }}
              >
                지금 해야 할 일
              </Text>
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#78350F",
                marginBottom: 4,
              }}
            >
              {currentTask.title}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#78350F",
                lineHeight: 19,
                marginBottom: 12,
              }}
            >
              {currentTask.description}
            </Text>
            {currentTask.primary !== undefined ? (
              <Pressable
                onPress={currentTask.primary.onPress}
                style={{
                  backgroundColor: "#3182F6",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {currentTask.primary.label}
                </Text>
              </Pressable>
            ) : null}
            {currentTask.secondary !== undefined ? (
              <>
                <Pressable
                  onPress={currentTask.secondary.onPress}
                  style={{
                    backgroundColor: "#FFFFFF",
                    paddingVertical: 11,
                    borderRadius: 10,
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: "#3182F6",
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#3182F6",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {currentTask.secondary.label}
                  </Text>
                </Pressable>
                {currentTask.secondaryDisclaimer !== undefined ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 6,
                      paddingHorizontal: 4,
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={11}
                      color="#92400E"
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 10,
                        color: "#92400E",
                        lineHeight: 14,
                      }}
                    >
                      {currentTask.secondaryDisclaimer}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        )}

        {/* Step 6 (investigation) 수동 상태 업데이트 — 종결된 사건은 숨김 */}
        {currentStep === "investigation" &&
        reportCase.status !== "RESOLVED" &&
        reportCase.status !== "UNRESOLVED" ? (
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
                fontSize: 14,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 4,
              }}
            >
              사건 진행 상태 업데이트
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#64748B",
                lineHeight: 17,
                marginBottom: 12,
              }}
            >
              노동청·사업주로부터 변동이 있으면 직접 갱신해주세요
            </Text>

            {(() => {
              const SUB_STATUS_ORDER: InvestigationSubStatus[] = [
                "waiting_inspector",
                "awaiting_hearing",
                "under_correction",
                "resolved_confirm",
              ];
              const curSubIdx = SUB_STATUS_ORDER.indexOf(
                reportCase.investigationStatus ?? "waiting_inspector",
              );
              const items: Array<{
                key: InvestigationSubStatus;
                label: string;
                desc: string;
                tappableWhenStatus: (s: InvestigationSubStatus) => boolean;
                confirm: () => void;
              }> = [
                {
                  key: "awaiting_hearing",
                  label: "출석요구서를 받았어요",
                  desc: "출석조사 단계로 전환",
                  tappableWhenStatus: (s) => s === "waiting_inspector",
                  confirm: () =>
                    updateInvestigationStatus(
                      reportCase.id,
                      "awaiting_hearing",
                    ),
                },
                {
                  key: "under_correction",
                  label: "시정지시가 완료됐어요",
                  desc: "사업주에게 지급 시정지시 발부됨",
                  tappableWhenStatus: (s) => s === "awaiting_hearing",
                  confirm: () => {
                    updateInvestigationStatus(
                      reportCase.id,
                      "under_correction",
                    );
                    updateCaseStatus(reportCase.id, "CORRECTION_ORDERED");
                  },
                },
                {
                  key: "resolved_confirm",
                  label: "돈을 받았어요 (해결 확인)",
                  desc: "해결 확인 화면으로 이동",
                  tappableWhenStatus: (s) =>
                    s === "awaiting_hearing" || s === "under_correction",
                  confirm: () => {
                    updateInvestigationStatus(
                      reportCase.id,
                      "resolved_confirm",
                    );
                    setShowResolveConfirm(true);
                  },
                },
              ];
              return items.map((item) => {
                const itemIdx = SUB_STATUS_ORDER.indexOf(item.key);
                const isCompleted = curSubIdx >= itemIdx;
                const isPending = pendingInvestigationStatus === item.key;
                const isTappable =
                  !isCompleted &&
                  item.tappableWhenStatus(
                    reportCase.investigationStatus ?? "waiting_inspector",
                  );
                return (
                  <View key={item.key} style={{ marginBottom: 8 }}>
                    <Pressable
                      onPress={
                        isTappable
                          ? () => setPendingInvestigationStatus(item.key)
                          : undefined
                      }
                      disabled={!isTappable}
                      style={{
                        borderWidth: 1,
                        borderColor: isPending
                          ? "#1A5FAF"
                          : isTappable
                            ? "#3182F6"
                            : "#E2E8F0",
                        backgroundColor: isCompleted ? "#F5F5F0" : "#FFFFFF",
                        borderRadius: 10,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        // 펜딩 행은 아래 확인 영역과 자연스럽게 이어지도록 하단 둥글기 제거
                        borderBottomLeftRadius: isPending ? 0 : 10,
                        borderBottomRightRadius: isPending ? 0 : 10,
                        borderBottomWidth: isPending ? 0 : 1,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          flex: 1,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: isCompleted
                              ? "#3B6D11"
                              : "#FFFFFF",
                            borderWidth: 1.5,
                            borderColor: isCompleted
                              ? "#3B6D11"
                              : isPending
                                ? "#1A5FAF"
                                : "#C5C4BE",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isCompleted ? (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color="#FFFFFF"
                            />
                          ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: isCompleted
                                ? "#888888"
                                : isTappable
                                  ? "#0F172A"
                                  : "#94A3B8",
                              textDecorationLine: isCompleted
                                ? "line-through"
                                : "none",
                              marginBottom: 2,
                            }}
                          >
                            {item.label}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: isCompleted
                                ? "#CBD5E1"
                                : isTappable
                                  ? "#64748B"
                                  : "#CBD5E1",
                            }}
                          >
                            {item.desc}
                          </Text>
                        </View>
                      </View>
                      {!isCompleted && !isPending ? (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={isTappable ? "#3182F6" : "#CBD5E1"}
                        />
                      ) : null}
                    </Pressable>

                    {/* 인라인 예/아니오 확인 */}
                    {isPending ? (
                      <View
                        style={{
                          backgroundColor: "#EBF3FF",
                          borderWidth: 1,
                          borderTopWidth: 0,
                          borderColor: "#1A5FAF",
                          borderBottomLeftRadius: 10,
                          borderBottomRightRadius: 10,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#185FA5",
                            fontWeight: "500",
                            marginBottom: 10,
                          }}
                        >
                          {`정말 "${item.label}" 상태로 업데이트할까요?`}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            justifyContent: "flex-end",
                          }}
                        >
                          <Pressable
                            onPress={() =>
                              setPendingInvestigationStatus(null)
                            }
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: "#FFFFFF",
                              borderWidth: 0.5,
                              borderColor: "#C5C4BE",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                color: "#666666",
                                fontWeight: "500",
                              }}
                            >
                              아니오
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setPendingInvestigationStatus(null);
                              item.confirm();
                            }}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: "#1A5FAF",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                color: "#FFFFFF",
                                fontWeight: "600",
                              }}
                            >
                              예, 맞아요
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              });
            })()}
          </View>
        ) : null}

        {/* V2 — "증거 내용 작성" 섹션 제거. evidence 입력은 EvidenceFlowView로 단일화됨. */}

        {/* 진행 단계 체크리스트 */}
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
              fontSize: 14,
              fontWeight: "600",
              color: "#0F172A",
              marginBottom: 12,
            }}
          >
            진행 단계
          </Text>

          {/* StepNavigator — ‹ N/M 단계명 › . 다음 버튼은 highestStep 이하만 활성. */}
          {(() => {
            const navCurIdx = STEP_ORDER.indexOf(reportCase.currentStep);
            const navHighIdx = STEP_ORDER.indexOf(reportCase.highestStep);
            const canPrev = navCurIdx > 0;
            const canNext = navCurIdx < navHighIdx;
            const navEditMode = navCurIdx < navHighIdx;
            const navCurMeta = STEP_META[reportCase.currentStep];
            const goPrev = (): void => {
              if (!canPrev) return;
              handleNavigateToStep(STEP_ORDER[navCurIdx - 1]);
            };
            const goNext = (): void => {
              if (!canNext) return;
              handleNavigateToStep(STEP_ORDER[navCurIdx + 1]);
            };
            return (
              <View style={{ marginBottom: 14 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F5F5F0",
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <Pressable
                    onPress={goPrev}
                    disabled={!canPrev}
                    hitSlop={8}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: canPrev ? "#FFFFFF" : "#F5F5F0",
                      borderWidth: canPrev ? 0.5 : 0,
                      borderColor: "#E0E0DC",
                    }}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={canPrev ? "#1A5FAF" : "#C5C4BE"}
                    />
                  </Pressable>

                  <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                    {navEditMode ? (
                      <View
                        style={{
                          backgroundColor: "#FAEEDA",
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          marginBottom: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#BA7517",
                            fontWeight: "600",
                          }}
                        >
                          ✏️ 수정 중
                        </Text>
                      </View>
                    ) : null}
                    <Text style={{ fontSize: 11, color: "#AAAAAA" }}>
                      {`${navCurIdx + 1} / ${STEP_ORDER.length}`}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#0F172A",
                      }}
                    >
                      {navCurMeta.label}
                    </Text>
                  </View>

                  <Pressable
                    onPress={goNext}
                    disabled={!canNext}
                    hitSlop={8}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: canNext ? "#FFFFFF" : "#F5F5F0",
                      borderWidth: canNext ? 0.5 : 0,
                      borderColor: "#E0E0DC",
                    }}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={canNext ? "#1A5FAF" : "#C5C4BE"}
                    />
                  </Pressable>
                </View>

                {navEditMode ? (
                  <Pressable
                    onPress={() =>
                      handleNavigateToStep(reportCase.highestStep)
                    }
                    hitSlop={6}
                    style={{
                      alignSelf: "flex-end",
                      paddingTop: 6,
                      paddingRight: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#1A5FAF" }}>
                      {`현재 진행 단계(${STEP_META[reportCase.highestStep].label})로 →`}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })()}
          {STEP_ORDER.map((stepId, idx) => {
            const isCompleted = reportCase.completedSteps.includes(stepId);
            const isActive = reportCase.currentStep === stepId;
            const isPending = !isCompleted && !isActive;
            const meta = STEP_META[stepId];

            // 수정 모드: 현재 활성 단계가 highestStep보다 앞에 있을 때
            const highestIdx = STEP_ORDER.indexOf(reportCase.highestStep);
            const isEditMode = isActive && idx < highestIdx;
            const isTappable = isCompleted || isActive;

            // 활성 단계 일반 inline 액션 버튼 (complaint_draft / investigation 멘토 진입점)
            let inlineAction:
              | { label: string; onPress: () => void }
              | undefined;
            if (isActive) {
              if (stepId === "complaint_draft") {
                inlineAction = {
                  label: "멘토와 함께 작성 · 10,000원",
                  onPress: handleConnectMentor,
                };
              } else if (stepId === "investigation") {
                inlineAction = {
                  label: "출석조사 멘토 연결",
                  onPress: handleConnectMentor,
                };
              }
            }

            return (
              <Pressable
                key={stepId}
                onPress={
                  isTappable ? () => handleNavigateToStep(stepId) : undefined
                }
                disabled={!isTappable}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginBottom: 14,
                  paddingLeft: 8,
                  paddingVertical: 2,
                  borderLeftWidth: 3,
                  borderLeftColor: isEditMode
                    ? "#BA7517"
                    : isActive
                      ? "#3182F6"
                      : "transparent",
                  backgroundColor: isEditMode
                    ? "rgba(250, 238, 218, 0.4)"
                    : "transparent",
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor:
                        isCompleted || isActive ? "#3182F6" : "#FFFFFF",
                      borderWidth: isPending ? 1 : 0,
                      borderColor: "#CBD5E1",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: isActive ? "#FFFFFF" : "#94A3B8",
                        }}
                      >
                        {idx + 1}
                      </Text>
                    )}
                  </View>
                  {idx < STEP_ORDER.length - 1 ? (
                    <View
                      style={{
                        width: 2,
                        flex: 1,
                        backgroundColor: isCompleted ? "#3182F6" : "#F1F5F9",
                        marginTop: 4,
                        minHeight: 16,
                      }}
                    />
                  ) : null}
                </View>

                <View style={{ flex: 1, paddingBottom: 6 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? "700" : "600",
                        color: isActive
                          ? "#0F172A"
                          : isPending
                            ? "#94A3B8"
                            : "#64748B",
                      }}
                    >
                      {meta.label}
                    </Text>
                    {/* 수정 모드 — 현재 활성 단계가 highestStep보다 이전 */}
                    {isEditMode ? (
                      <View
                        style={{
                          backgroundColor: "#FAEEDA",
                          borderRadius: 8,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#BA7517",
                            fontWeight: "600",
                          }}
                        >
                          ✏️ 수정 중
                        </Text>
                      </View>
                    ) : isCompleted ? (
                      <View
                        style={{
                          backgroundColor: "#EBF3FF",
                          borderRadius: 8,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#185FA5",
                            fontWeight: "500",
                          }}
                        >
                          수정 가능
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {/* pending 단계는 description 숨김 (스펙) */}
                  {isCompleted || isActive ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: isActive ? "#475569" : "#94A3B8",
                        marginTop: 2,
                        lineHeight: 17,
                      }}
                    >
                      {meta.description}
                    </Text>
                  ) : null}


                  {/* complaint_draft / investigation 단계의 멘토 진입 버튼 */}
                  {inlineAction !== undefined ? (
                    <Pressable
                      onPress={inlineAction.onPress}
                      style={{
                        marginTop: 10,
                        alignSelf: "flex-start",
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderWidth: 1,
                        borderColor: "#3182F6",
                        borderRadius: 8,
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#3182F6",
                        }}
                      >
                        {inlineAction.label}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>


        {/* 사건 해결 확인 진입점 — 노동청 시정지시 이후 단계에서만 노출 */}
        {reportCase.status === "INSPECTING" ||
        reportCase.status === "CORRECTION_ORDERED" ? (
          <Pressable
            onPress={() => setShowResolveConfirm(true)}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderWidth: 1,
              borderColor: "#BBF7D0",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: "#DCFCE7",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="checkmark-done" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#0F172A" }}
              >
                임금을 받으셨나요?
              </Text>
              <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                해결 확인 시 멘토 결제 ₩3,000 환급
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </Pressable>
        ) : null}

        {/* 연결된 멘토 — 활성 매칭이 있으면 채팅방 빠른 진입 카드 */}
        {caseMentorMatches.length > 0 ? (
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
                gap: 6,
                marginBottom: 10,
              }}
            >
              <Ionicons name="chatbubbles" size={18} color="#1B64DA" />
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
              >
                연결된 멘토
              </Text>
            </View>
            {caseMentorMatches.map((m) => {
              const preview = m.lastMessagePreview ?? "새 대화";
              const dateLabel =
                m.lastMessageAt !== undefined
                  ? new Date(m.lastMessageAt).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })
                  : "";
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    useReportStore
                      .getState()
                      .setShouldSkipNextFocusReset(true);
                    router.push(`/mentor-chat/${m.id}`);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#F8FAFC",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "#EBF3FF",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#185FA5",
                        }}
                      >
                        {m.mentorNickname.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#0F172A",
                        }}
                      >
                        {`${m.mentorNickname} 멘토`}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 12,
                          color:
                            m.lastMessagePreview !== undefined
                              ? "#64748B"
                              : "#1A5FAF",
                          marginTop: 2,
                          maxWidth: 200,
                        }}
                      >
                        {preview}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    {dateLabel !== "" ? (
                      <Text style={{ fontSize: 11, color: "#94A3B8" }}>
                        {dateLabel}
                      </Text>
                    ) : null}
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#CBD5E1"
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* 멘토 연결하기 — 신고 정보 입력 전/후로 분기 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <Ionicons name="school" size={18} color="#3182F6" />
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
            >
              {currentStep === "evidence_collection"
                ? "멘토 둘러보기"
                : "멘토 연결하기"}
            </Text>
          </View>

          {currentStep === "evidence_collection" ? (
            <>
              {/* 1단계 — 매칭 알고리즘 가동 전. 둘러보기만 가능 + 결제도 가능 */}
              <Text
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  lineHeight: 18,
                  marginBottom: 12,
                }}
              >
                신고 정보를 먼저 입력하면 사건에 맞춰 Top-3가 추천돼요.{"\n"}
                지금은 전체 멘토를 살펴볼 수 있어요.
              </Text>
              <Pressable
                onPress={() => setShowMentorBrowse(true)}
                style={{
                  backgroundColor: "#3182F6",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="people" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    전체 멘토 둘러보기
                  </Text>
                  <Text
                    style={{
                      color: "#DBEAFE",
                      fontSize: 11,
                      marginTop: 2,
                      lineHeight: 15,
                    }}
                  >
                    업종·지역·피해유형으로 필터해서 찾기
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </>
          ) : (
            <>
              {/* 2단계 이후 — 매칭 알고리즘 가동 + 더보기 진입점 */}
              <Text
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  lineHeight: 18,
                  marginBottom: 12,
                }}
              >
                사건 정보를 기반으로 가장 적합한 멘토를 추천해드려요
              </Text>
              <Pressable
                onPress={handleConnectMentor}
                style={{
                  backgroundColor: "#3182F6",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    연결할 멘토 찾기
                  </Text>
                  <Text
                    style={{
                      color: "#DBEAFE",
                      fontSize: 11,
                      marginTop: 2,
                      lineHeight: 15,
                    }}
                  >
                    사건과 가장 비슷한 경험을 가진 멘토 Top-3 추천
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </Pressable>
              {/* 멘토 더보기 — Top-3에 마음에 드는 사람이 없을 때 직접 검색 */}
              <Pressable
                onPress={() => setShowMentorBrowse(true)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 10,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  borderWidth: 1,
                  borderColor: "#3182F6",
                  marginBottom: 10,
                }}
              >
                <Ionicons name="search" size={13} color="#3182F6" />
                <Text
                  style={{
                    color: "#3182F6",
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  멘토 더보기 (전체 검색)
                </Text>
              </Pressable>
            </>
          )}

          {/* 면책 문구 — 공통 */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 4,
              paddingTop: 4,
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={12}
              color="#94A3B8"
              style={{ marginTop: 1 }}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                color: "#94A3B8",
                lineHeight: 17,
              }}
            >
              이 멘토는 동료 근로자입니다. 법률 자문이 아닌 경험 공유입니다.
              법적 판단은 공인노무사·변호사에게 받으세요.
            </Text>
          </View>
        </View>

        {/* 신고 취하 */}
        <Pressable
          onPress={handleClose}
          style={{ paddingVertical: 12, alignItems: "center" }}
        >
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            신고 취하하기
          </Text>
        </Pressable>
      </ScrollView>

      {/* BrowseView에서 멘토 선택 후 결제 진입 */}
      {browsedMentorId !== null ? (
        <MentorQuickMatchModal
          visible
          mentorUserId={browsedMentorId}
          activeCases={[reportCase]}
          onClose={() => setBrowsedMentorId(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
