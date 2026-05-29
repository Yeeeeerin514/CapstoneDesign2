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
import { useGroupStore } from "@/features/co-action";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { GroupJoinView } from "./GroupJoinView";
import { router } from "expo-router";
import { MentorRecommendView } from "./MentorRecommendView";
import { SmartMentorRecommendView } from "./SmartMentorRecommendView";
import {
  inferBusinessSize,
  mapDamageTypeLabelsToCode,
  mapIndustryLabelToCode,
  mapRegionLabelToCode,
} from "./report-case-mapper";
import { GroupChatView } from "./GroupChatView";
import { useMentorMatchStore } from "@/features/mentor-match";
import { ReportDraftWizardView } from "./ReportDraftWizardView";
import { ResolveConfirmView } from "./ResolveConfirmView";
import { SubmissionResultView } from "./SubmissionResultView";
import { CaseAmountHeader } from "./CaseAmountHeader";
import { EvidenceTodoBox } from "./EvidenceTodoBox";
import { AmountCalcTodoBox } from "./AmountCalcTodoBox";
import { EvidenceSection } from "./EvidenceSection";
import { ManualWageInputModal } from "./ManualWageInputModal";
import { ResolveSuccessView } from "./ResolveSuccessView";
import { ReviewWriteView } from "./ReviewWriteView";
import {
  STEP_ORDER,
  STEP_META,
  type CaseStep,
  type FileEvidenceKey,
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
  onFindCoAction: () => void;
  onOpenWork24: () => void;
  onStartDraft: () => void;
  onEvidenceComplete: () => void;
  onViewGroup: () => void;
  onOpenResolveConfirm: () => void;
  /** 본인이 이미 그룹 멤버로 참여 중인지. group_decision 박스 분기에 사용. */
  isAlreadyMember: boolean;
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
        title: "증거 수집 중",
        description: "수집된 증거를 확인하고, 충분하면 다음 단계로 넘어가세요",
        primary: {
          label: "증거 충분해요, 다음 단계로 →",
          onPress: handlers.onEvidenceComplete,
        },
      };
    case "amount_calculation":
      return {
        title: "미지급 금액을 계산할게요",
        description: "근무시간과 계약 시급을 기반으로 산정합니다",
        primary: { label: "금액 계산 시작", onPress: handlers.onAdvance },
      };
    case "group_decision":
      if (handlers.isAlreadyMember) {
        return {
          title: "공동대응 그룹 참여 중 ✓",
          description: "현재 공동대응 그룹에 참여하고 있어요",
          primary: {
            label: "그룹 현황 보기 →",
            onPress: handlers.onViewGroup,
          },
          secondary: {
            label: "다음 단계로 (진정서 작성)",
            onPress: handlers.onAdvance,
          },
        };
      }
      return {
        title: "공동대응 여부를 결정해주세요",
        description: "진정서 작성 전에 함께할 동료를 찾으세요",
        primary: {
          label: "공동대응 동료 찾기 →",
          onPress: handlers.onFindCoAction,
        },
        secondary: { label: "혼자 진행할게요", onPress: handlers.onAdvance },
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
  const allCases = useReportStore((s) => s.cases);
  const completeStep = useReportStore((s) => s.completeStep);
  const setCurrentStepAction = useReportStore((s) => s.setCurrentStep);
  const updateInvestigationStatus = useReportStore(
    (s) => s.updateInvestigationStatus,
  );
  const updateCaseStatus = useReportStore((s) => s.updateCaseStatus);
  const setManualWageInput = useReportStore((s) => s.setManualWageInput);
  const startAmountCalc = useReportStore((s) => s.startAmountCalc);
  const finishAmountCalc = useReportStore((s) => s.finishAmountCalc);
  const confirmAmountCalc = useReportStore((s) => s.confirmAmountCalc);
  const navigateToStep = useReportStore((s) => s.navigateToStep);
  const findGroupByWorkplace = useGroupStore((s) => s.findGroupByWorkplace);
  const isAlreadyMemberFn = useGroupStore((s) => s.isAlreadyMember);
  const userId = useAuthStore((s) => s.userIdString);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showGroupJoin, setShowGroupJoin] = useState(false);
  const [showMentorRecommend, setShowMentorRecommend] = useState(false);
  const [showSmartMentor, setShowSmartMentor] = useState(false);
  const [showDraftWizard, setShowDraftWizard] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [showSubmissionResult, setShowSubmissionResult] = useState(false);
  const [showWageModal, setShowWageModal] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  /** 증거 섹션 위치 측정용 ref — TodoBox 버튼 → 해당 행으로 스크롤 시 사용. */
  const evidenceSectionRef = useRef<View | null>(null);
  /** 잠깐 강조할 증거 종류 — 깜빡임 애니메이션 + 파란 테두리. */
  const [highlightedEvidenceType, setHighlightedEvidenceType] =
    useState<FileEvidenceKey | null>(null);
  /** Step 6 사건 진행 상태 업데이트 박스 — 인라인 예/아니오 확인 대기 중인 항목. */
  const [pendingInvestigationStatus, setPendingInvestigationStatus] =
    useState<InvestigationSubStatus | null>(null);
  /** 사건 상세 내부에서 직접 그룹 채팅 열기 위한 overlay 상태. */
  const [showGroupChat, setShowGroupChat] = useState<{
    groupId: string;
    groupName: string;
  } | null>(null);
  const createMentorMatch = useMentorMatchStore((s) => s.createMatch);
  const caseMentorMatches = useMentorMatchStore((s) =>
    s.matches.filter(
      (m) => m.caseId === reportCase?.id && m.status === "active",
    ),
  );
  const [showResolveSuccess, setShowResolveSuccess] = useState(false);
  const [showReviewWrite, setShowReviewWrite] = useState(false);

  if (reportCase === undefined) {
    return null;
  }

  if (showGroupChat !== null) {
    return (
      <GroupChatView
        groupId={showGroupChat.groupId}
        groupName={showGroupChat.groupName}
        onBack={() => setShowGroupChat(null)}
      />
    );
  }

  if (showGroupJoin) {
    return (
      <GroupJoinView
        workplaceName={reportCase.workplaceName}
        caseId={reportCase.id}
        myAmount={reportCase.calculatedUnpaid ?? 0}
        onBack={() => setShowGroupJoin(false)}
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

  // 공동대응 배너: useGroupStore에서 같은 업장 그룹 탐색
  const sameWorkplaceGroup = findGroupByWorkplace(reportCase.workplaceName);
  // userId 기반 멤버 확인 (배너 / group_decision 박스 분기 공용)
  const isAlreadyMember =
    sameWorkplaceGroup !== undefined
      ? isAlreadyMemberFn(sameWorkplaceGroup.id, userId)
      : false;
  // 본인의 그룹 내 역할 — 대표자(leaderId 일치) / 자원자(isVolunteer) 여부.
  const myMember = sameWorkplaceGroup?.members.find(
    (m) => m.userId === userId,
  );
  const isLeader =
    sameWorkplaceGroup !== undefined &&
    sameWorkplaceGroup.leaderId === userId;
  const isVolunteer = myMember?.isVolunteer === true;
  const showGroupBanner =
    sameWorkplaceGroup !== undefined && !isAlreadyMember && !bannerDismissed;
  const otherMemberCount = sameWorkplaceGroup?.members.length ?? 0;

  // 본문 "공동대응 그룹" 섹션은 useReportStore.cases 기반 peer 도출 유지
  const peerCases = allCases.filter(
    (c) => c.id !== caseId && c.workplaceName === reportCase.workplaceName,
  );
  const peerCount = peerCases.length;
  const totalGroupDamage =
    (reportCase.calculatedUnpaid ?? 0) +
    peerCases.reduce((sum, c) => sum + (c.calculatedUnpaid ?? 0), 0);

  const handleAdvance = (): void => {
    // Alert 없이 즉시 진행 — "혼자 진행할게요" / "다음 단계로 (진정서 작성)" 모두 같은 핸들러.
    advanceStep(reportCase.id);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleConnectMentor = (): void => {
    // 메인 매칭 흐름은 AI 시스템 (Gower + Gale-Shapley + Thompson Sampling)
    setShowSmartMentor(true);
  };

  const handleFindCoAction = (): void => {
    setShowGroupJoin(true);
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
   * TodoBox의 "🏦 통장 내역 추가하기" 등을 누르면 호출.
   * EvidenceSection의 해당 행으로 스크롤 + 2.5초간 깜빡임 강조.
   * 파일 추가 자체는 EvidenceSection 안의 [+ 추가] 버튼이 ActionSheet로 진행.
   */
  const scrollToEvidenceItem = (type: FileEvidenceKey): void => {
    const scrollNode = scrollViewRef.current;
    const target = evidenceSectionRef.current;
    if (scrollNode === null || target === null) {
      setHighlightedEvidenceType(type);
      return;
    }
    target.measureLayout(
      // @ts-expect-error — RN typing: ScrollView's underlying node is acceptable here.
      scrollNode,
      (_x: number, y: number) => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      },
      () => {
        // measureLayout 실패 시에도 강조만 진행.
      },
    );
    setHighlightedEvidenceType(type);
    setTimeout(() => setHighlightedEvidenceType(null), 2500);
  };

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

  const handleEvidenceComplete = (): void => {
    Alert.alert(
      "증거 수집 완료",
      "지금까지 수집한 증거로 다음 단계로 넘어갈까요?\n\n나중에도 증거를 추가할 수 있지만,\n진정서 작성 전에 추가하는 것이 좋습니다.",
      [
        { text: "계속 수집할게요", style: "cancel" },
        {
          text: "다음 단계로 →",
          onPress: () => {
            completeStep(reportCase.id, "evidence_collection");
            setCurrentStepAction(reportCase.id, "amount_calculation");
          },
        },
      ],
    );
  };

  const currentTask = getCurrentTaskByStep(currentStep, {
    onAdvance: handleAdvance,
    onConnectMentor: handleConnectMentor,
    onFindCoAction: handleFindCoAction,
    onOpenWork24: handleOpenWork24,
    onStartDraft: handleStartDraft,
    onEvidenceComplete: handleEvidenceComplete,
    onViewGroup: handleFindCoAction,
    onOpenResolveConfirm: () => setShowResolveConfirm(true),
    isAlreadyMember,
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
          <CaseAmountHeader reportCase={reportCase} />
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

        {/* 공동대응 알림 배너 */}
        {showGroupBanner ? (
          <View
            style={{
              backgroundColor: "#EBF3FF",
              borderLeftWidth: 4,
              borderLeftColor: "#3182F6",
              borderRadius: 10,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <Pressable
              onPress={() => setBannerDismissed(true)}
              hitSlop={6}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={14} color="#64748B" />
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
                paddingRight: 24,
              }}
            >
              <Ionicons name="people" size={16} color="#1B64DA" />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#0F172A",
                }}
              >
                같은 업장 피해자가 있어요!
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "#1E40AF",
                lineHeight: 18,
                marginBottom: 10,
              }}
            >
              {`${reportCase.workplaceName}에서 신고한 사람이 ${otherMemberCount}명 더 있습니다. 함께 대응하면 더 빠르게 해결됩니다.`}
            </Text>
            <Pressable
              onPress={() => setShowGroupJoin(true)}
              style={{
                backgroundColor: "#3182F6",
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                공동대응 참여하기
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        {/* 지금 해야 할 일 — evidence_collection / amount_calculation / investigation 종결은 별도 카드.
            (수정 모드 배너는 진행 단계 카드 상단의 StepNavigator로 대체됨) */}
        {currentStep === "evidence_collection" ? (
          <EvidenceTodoBox
            reportCase={reportCase}
            onScrollToEvidence={scrollToEvidenceItem}
            onManualInputWage={() => setShowWageModal(true)}
            onEvidenceComplete={handleEvidenceComplete}
          />
        ) : currentStep === "amount_calculation" ? (
          <AmountCalcTodoBox
            reportCase={reportCase}
            onStartCalc={() => {
              startAmountCalc(reportCase.id);
              // Phase A mock: 1.2초 지연 후 계산 완료 처리. Phase B에선 실제 백엔드 호출.
              setTimeout(() => {
                finishAmountCalc(reportCase.id);
              }, 1200);
            }}
            onConfirm={() => confirmAmountCalc(reportCase.id)}
            onEdit={() => setShowWageModal(true)}
          />
        ) : currentStep === "group_decision" &&
          isAlreadyMember &&
          sameWorkplaceGroup !== undefined ? (
          // Step 3 — 이미 참여 중일 때: 그룹 현황 + 그룹 채팅 나란히 + 다음 단계 secondary
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
                marginBottom: 4,
              }}
            >
              <Ionicons name="people" size={18} color="#92400E" />
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
                marginBottom: 12,
              }}
            >
              공동대응 그룹에 참여하고 있어요
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={handleFindCoAction}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#1A5FAF",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#1A5FAF",
                  }}
                >
                  그룹 현황 보기
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setShowGroupChat({
                    groupId: sameWorkplaceGroup.id,
                    groupName: sameWorkplaceGroup.workplaceName,
                  })
                }
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: "#1A5FAF",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  💬 그룹 채팅
                </Text>
              </Pressable>
            </View>
            <Pressable
              onPress={handleAdvance}
              style={{
                marginTop: 10,
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                borderWidth: 1.5,
                borderColor: "#3182F6",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#3182F6",
                }}
              >
                다음 단계로 (진정서 작성)
              </Text>
            </Pressable>
          </View>
        ) : currentStep === "investigation" &&
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

        {/* 자동 수집된 증거 — evidence_collection 단계에서만 표시 */}
        {currentStep === "evidence_collection" ? (
          <View
            ref={evidenceSectionRef}
            collapsable={false}
          >
            <EvidenceSection
              caseId={reportCase.id}
              reportCase={reportCase}
              highlightedType={highlightedEvidenceType}
            />
          </View>
        ) : null}

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

            // group_decision 활성 시 특별 인라인 위젯
            const showGroupDecisionInline =
              isActive && stepId === "group_decision";

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

                  {/* group_decision 활성: 그룹 상태 기반 위젯
                       - 그룹 없음:       "아직 동료가 없어요" + [혼자 진행하기]
                       - 미참여:          "현재 N명 참여 중" + [참여하기]
                       - 이미 참여 중:    "✅ 공동대응 참여 중 · N명" + [💬 그룹 채팅] */}
                  {showGroupDecisionInline ? (
                    <View
                      style={{
                        marginTop: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#475569",
                          flex: 1,
                        }}
                      >
                        {sameWorkplaceGroup === undefined
                          ? "아직 동료가 없어요"
                          : isAlreadyMember
                            ? `✅ 공동대응 참여 중 · ${sameWorkplaceGroup.members.length}명`
                            : `현재 ${sameWorkplaceGroup.members.length}명 참여 중`}
                      </Text>
                      {sameWorkplaceGroup === undefined ? (
                        <Pressable
                          onPress={handleAdvance}
                          style={{
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
                            혼자 진행하기
                          </Text>
                        </Pressable>
                      ) : isAlreadyMember ? (
                        <Pressable
                          onPress={() =>
                            setShowGroupChat({
                              groupId: sameWorkplaceGroup.id,
                              groupName: sameWorkplaceGroup.workplaceName,
                            })
                          }
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderWidth: 0.5,
                            borderColor: "#B5D4F4",
                            borderRadius: 8,
                            backgroundColor: "#EBF3FF",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: "#185FA5",
                            }}
                          >
                            💬 그룹 채팅
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={handleFindCoAction}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: "#3182F6",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: "#FFFFFF",
                            }}
                          >
                            참여하기
                          </Text>
                        </Pressable>
                      )}
                    </View>
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

        {/* 공동대응 그룹 본문 섹션 — 참여 완료(isAlreadyMember) 시에만 노출.
            미참여 상태에선 상단 GroupAlertBanner만 표시 → 참여 유도. */}
        {isAlreadyMember && peerCount > 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            {/* 헤더 */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Ionicons name="people" size={18} color="#3182F6" />
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
              >
                공동대응 그룹
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "#64748B",
                marginBottom: 12,
              }}
            >
              {`${reportCase.workplaceName} 공동대응 그룹`}
            </Text>

            {/* 멤버 현황 */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#475569",
                marginBottom: 8,
              }}
            >
              멤버 현황
            </Text>
            <View
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: 10,
                paddingVertical: 4,
                paddingHorizontal: 12,
                marginBottom: 10,
              }}
            >
              {peerCases.map((peer, idx) => {
                const nickname = `닉네임${String.fromCharCode(65 + idx)}`;
                const isLeader = idx === 0;
                return (
                  <View
                    key={peer.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F1F5F9",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#0F172A",
                        fontWeight: "500",
                      }}
                    >
                      {nickname}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#94A3B8", marginLeft: 6 }}
                    >
                      {`· 미지급 ₩${(peer.calculatedUnpaid ?? 0).toLocaleString()}`}
                    </Text>
                    {isLeader ? (
                      <View
                        style={{
                          marginLeft: "auto",
                          backgroundColor: "#FEF3C7",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#92400E",
                            fontWeight: "700",
                          }}
                        >
                          대표자 👑
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#3182F6",
                    fontWeight: "700",
                  }}
                >
                  나
                </Text>
                <Text
                  style={{ fontSize: 12, color: "#94A3B8", marginLeft: 6 }}
                >
                  {`· 미지급 ₩${(reportCase.calculatedUnpaid ?? 0).toLocaleString()}`}
                </Text>
              </View>
            </View>

            {/* 총 피해액 + 그룹 상태 */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 8,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: "#475569" }}>
                총 피해액
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#DC2626" }}
              >
                {`₩${totalGroupDamage.toLocaleString()}`}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 8,
                marginBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#F1F5F9",
              }}
            >
              <Text style={{ fontSize: 13, color: "#475569" }}>
                그룹 상태
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: "600", color: "#92400E" }}
              >
                🟡 대표자 선출 중 (48시간 이내)
              </Text>
            </View>

            {/* 대표자 선출 안내 */}
            <View
              style={{
                backgroundColor: "#FFFBEB",
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#FDE68A",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#92400E",
                  marginBottom: 4,
                }}
              >
                대표자 선출 안내
              </Text>
              <Text
                style={{ fontSize: 11, color: "#78350F", lineHeight: 16 }}
              >
                48시간 내 자원자가 없으면 피해액이 가장 큰 분이 자동으로 대표자가 됩니다.
              </Text>
            </View>

            {/* 본인 역할 기반 분기:
                  - 대표자 선출됨: 👑 안내 + 자원/멤버 버튼 없음
                  - 자원 완료: ✋ 자원 상태 표시
                  - 멤버 (자원 X): [지금 대표자로 자원하기] 단일 버튼 */}
            {isLeader ? (
              <View
                style={{
                  backgroundColor: "#FEF3C7",
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  alignItems: "center",
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "#FCD34D",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#92400E",
                  }}
                >
                  👑 당신이 대표자로 선출되었습니다
                </Text>
              </View>
            ) : isVolunteer ? (
              <View
                style={{
                  backgroundColor: "#EAF3DE",
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "#C0DD97",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#3B6D11",
                  }}
                >
                  ✋ 대표자로 자원하셨어요
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  if (sameWorkplaceGroup !== undefined) {
                    useGroupStore
                      .getState()
                      .volunteerAsLeader(sameWorkplaceGroup.id, userId);
                  }
                }}
                style={{
                  backgroundColor: "#3182F6",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  지금 대표자로 자원하기
                </Text>
              </Pressable>
            )}

            {/* 그룹 채팅 진입점 */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#F1F5F9",
                paddingTop: 12,
              }}
            >
              <Pressable
                onPress={() => {
                  if (sameWorkplaceGroup !== undefined) {
                    setShowGroupChat({
                      groupId: sameWorkplaceGroup.id,
                      groupName: sameWorkplaceGroup.workplaceName,
                    });
                  }
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="chatbubbles" size={16} color="#3182F6" />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#0F172A",
                    }}
                  >
                    공동대응 그룹 채팅
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#3182F6",
                      fontWeight: "600",
                    }}
                  >
                    바로가기
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color="#3182F6"
                  />
                </View>
              </Pressable>
            </View>
          </View>
        ) : null}

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

        {/* 연결된 공동대응 그룹 — 멤버일 때 항상 노출, 어느 단계에서도 채팅 1탭 진입.
            (멘토 카드와 동일한 visual + 동일한 위치 정책) */}
        {isAlreadyMember && sameWorkplaceGroup !== undefined ? (
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
              <Ionicons name="people" size={18} color="#1B64DA" />
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
              >
                연결된 공동대응 그룹
              </Text>
            </View>
            <Pressable
              onPress={() =>
                setShowGroupChat({
                  groupId: sameWorkplaceGroup.id,
                  groupName: sameWorkplaceGroup.workplaceName,
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#F8FAFC",
                borderRadius: 12,
                padding: 12,
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
                    backgroundColor: "#DBEAFE",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="people" size={20} color="#1B64DA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#0F172A",
                    }}
                  >
                    {sameWorkplaceGroup.workplaceName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      marginTop: 2,
                    }}
                  >
                    {`참여자 ${sameWorkplaceGroup.members.length}명${
                      isLeader
                        ? " · 👑 대표자"
                        : isVolunteer
                          ? " · ✋ 자원자"
                          : ""
                    }`}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={14}
                color="#CBD5E1"
              />
            </Pressable>
          </View>
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

        {/* 멘토 연결하기 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          {/* 헤더 */}
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
              멘토 연결하기
            </Text>
          </View>

          {/* Intro */}
          <Text
            style={{
              fontSize: 12,
              color: "#64748B",
              lineHeight: 18,
              marginBottom: 12,
            }}
          >
            [진정서 작성 단계]에서 연결하면 할인 없음{"\n"}
            지금 단계에서도 멘토를 찾아볼 수 있어요
          </Text>

          {/* AI 매칭 진입 버튼 — 사건 컨텍스트로 적합한 멘토를 찾아 추천 */}
          <Pressable
            onPress={handleConnectMentor}
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
              <Ionicons name="search" size={20} color="#FFFFFF" />
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

          {/* 면책 문구 */}
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

      <ManualWageInputModal
        visible={showWageModal}
        onClose={() => setShowWageModal(false)}
        onConfirm={(hourlyWage, workHours) => {
          setManualWageInput(reportCase.id, hourlyWage, workHours);
          setShowWageModal(false);
          Alert.alert(
            "입력 완료",
            `시급 ₩${hourlyWage.toLocaleString()} · ${workHours}시간으로 받아야 할 금액이 계산되었습니다.`,
          );
        }}
      />
    </SafeAreaView>
  );
}
