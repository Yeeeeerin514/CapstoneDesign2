import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useGroupStore } from "@/features/co-action";
import { useReportStore } from "@/features/report-submit";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { getGroupPhase, type GroupStatus } from "@/entities/group";
import { GroupChatView } from "./GroupChatView";

interface GroupJoinViewProps {
  workplaceName: string;
  /** 본인 사건 ID — joinGroup 시 caseId로 사용. */
  caseId: string;
  /** 본인 사건 미지급 금액 — joinGroup 시 amount로 사용. */
  myAmount: number;
  onBack: () => void;
}

const STATUS_BADGE: Record<
  GroupStatus,
  { label: string; bg: string; color: string }
> = {
  recruiting: { label: "모집 중", bg: "#E8F2FF", color: "#1B64DA" },
  electing: { label: "대표자 선출 중", bg: "#FEF3C7", color: "#92400E" },
  active: { label: "활성", bg: "#DCFCE7", color: "#15803D" },
  closed: { label: "종료", bg: "#F1F5F9", color: "#64748B" },
};

function formatHoursRemaining(deadlineIso: string): string {
  const now = Date.now();
  const deadline = new Date(deadlineIso).getTime();
  const ms = Math.max(0, deadline - now);
  if (ms === 0) return "마감됨";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours > 0) return `${hours}시간 남음`;
  const mins = Math.floor(ms / (1000 * 60));
  return `${mins}분 남음`;
}

export function GroupJoinView({
  workplaceName,
  caseId,
  myAmount,
  onBack,
}: GroupJoinViewProps): JSX.Element {
  const group = useGroupStore((s) => s.findGroupByWorkplace(workplaceName));
  const joinGroup = useGroupStore((s) => s.joinGroup);
  const volunteerAsLeader = useGroupStore((s) => s.volunteerAsLeader);
  const checkAndAutoElect = useGroupStore((s) => s.checkAndAutoElect);
  const leaveGroupFromGroupStore = useGroupStore((s) => s.leaveGroup);
  const reportCase = useReportStore((s) =>
    s.cases.find((c) => c.id === caseId),
  );
  const leaveGroupFromReportStore = useReportStore((s) => s.leaveGroup);
  const navigateToStep = useReportStore((s) => s.navigateToStep);
  const completeStep = useReportStore((s) => s.completeStep);
  const setCurrentStep = useReportStore((s) => s.setCurrentStep);
  const userId = useAuthStore((s) => s.userIdString);
  const nickname = useAuthStore((s) => s.nickname);
  const [showGroupChat, setShowGroupChat] = useState(false);
  /** 참여/자원 완료 후 nextStepBox로 부드럽게 스크롤. */
  const scrollViewRef = useRef<ScrollView | null>(null);

  // 마감 지났는데 미선출이면 자동 선출 (화면 진입 시마다 검사)
  useEffect(() => {
    if (group !== undefined) {
      checkAndAutoElect(group.id);
    }
  }, [group, checkAndAutoElect]);

  if (group === undefined) {
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
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            공동대응
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Ionicons name="people-outline" size={48} color="#94A3B8" />
          <Text
            style={{
              fontSize: 14,
              color: "#64748B",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            아직 공동대응 그룹이 생성되지 않았습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isMember = group.members.some((m) => m.userId === userId);
  const myMember = group.members.find((m) => m.userId === userId);
  const isVolunteer = myMember?.isVolunteer ?? false;
  const totalAmount =
    group.members.reduce((sum, m) => sum + m.amount, 0) +
    (isMember ? 0 : myAmount);
  const memberCount = isMember ? group.members.length : group.members.length + 1;
  if (showGroupChat) {
    return (
      <GroupChatView
        groupId={group.id}
        groupName={workplaceName}
        onBack={() => setShowGroupChat(false)}
      />
    );
  }

  const existingVolunteer = group.members.find(
    (m) => m.isVolunteer && m.userId !== userId,
  );
  const badge = STATUS_BADGE[group.status];
  const phaseInfo = getGroupPhase(group);

  const volunteers = group.members.filter((m) => m.isVolunteer);
  const remainingHours = Math.max(
    0,
    Math.ceil(
      (new Date(group.leaderElectionDeadline).getTime() - Date.now()) /
        3_600_000,
    ),
  );
  const isExpired = remainingHours === 0;
  const electionStatusText = (() => {
    if (isExpired) return "자원자 마감 — 피해액 최대자가 대표자로 선출됩니다";
    if (volunteers.length === 0)
      return `자원자를 모집 중이에요 (${remainingHours}시간 남음)`;
    if (volunteers.length === 1)
      return `${volunteers[0].nickname}님이 자원하셨어요`;
    return `${volunteers.length}명이 자원 — 피해액이 가장 큰 분이 대표자가 됩니다`;
  })();

  const ensureMember = (asVolunteer: boolean): void => {
    if (isMember) return;
    joinGroup(group.id, {
      userId: userId,
      caseId,
      nickname: nickname,
      amount: myAmount,
      isVolunteer: asVolunteer,
      joinedAt: new Date().toISOString(),
    });
  };

  const handleVolunteer = (): void => {
    const doVolunteer = (): void => {
      if (isMember) {
        volunteerAsLeader(group.id, userId);
      } else {
        ensureMember(true);
      }
      scrollToNextStepCta();
    };
    if (existingVolunteer !== undefined) {
      Alert.alert(
        "이미 자원자가 있어요",
        `${existingVolunteer.nickname}님이 자원하셨습니다. 추가 자원도 가능합니다. 자원자가 여러 명이면 피해액 기준으로 자동 선출됩니다.`,
        [
          { text: "취소" },
          { text: "그래도 자원", onPress: doVolunteer },
        ],
      );
      return;
    }
    doVolunteer();
  };

  /** 참여/자원 완료 후 화면 하단 nextStepBox로 자연스럽게 스크롤. */
  const scrollToNextStepCta = (): void => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleJoinAsMember = (): void => {
    if (isMember) return;
    ensureMember(false);
    scrollToNextStepCta();
  };

  const handleGroupChat = (): void => {
    if (group === undefined) {
      Alert.alert("그룹 없음", "참여 가능한 그룹이 없어요.");
      return;
    }
    setShowGroupChat(true);
  };

  /**
   * 공동대응 탈퇴:
   *   - 3단계(group_decision) 이전/중: 자유 탈퇴
   *   - 4단계(complaint_draft): 경고 후 탈퇴
   *   - 5단계(submission)/6단계(investigation): 불가 (개별 취하 절차 안내)
   * 탈퇴 시 두 store 모두 갱신 + 3단계로 되돌려서 재선택 여지를 줌.
   */
  const handleLeaveGroup = (): void => {
    if (group === undefined) return;
    const step = reportCase?.currentStep;
    const isAfterDraft = step === "complaint_draft";
    const warning = isAfterDraft
      ? "\n\n⚠️ 진정서 작성 단계에서 탈퇴하면 공동 진정서에서 빠집니다. 개별 진정서를 직접 작성해야 해요."
      : "";
    Alert.alert(
      "공동대응 탈퇴",
      `공동대응 그룹에서 탈퇴하시겠어요?${warning}\n\n탈퇴 후에도 다시 참여 가능합니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: () => {
            leaveGroupFromGroupStore(group.id, userId);
            if (reportCase !== undefined) {
              leaveGroupFromReportStore(reportCase.id);
              // 재선택 가능하도록 group_decision으로 되돌림.
              navigateToStep(reportCase.id, "group_decision");
            }
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
            {`${workplaceName} 공동대응`}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 0,
          paddingBottom: 32,
        }}
      >
        {/* 섹션 1: 그룹 현황 */}
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
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
            >
              그룹 현황
            </Text>
            <View
              style={{
                backgroundColor: badge.bg,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  color: badge.color,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {badge.label}
              </Text>
            </View>
          </View>

          {/* 긴급도 라벨 — phase에 따라 색상 자동 결정 */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: phaseInfo.urgencyColor,
              }}
            />
            <Text
              style={{
                fontSize: 12,
                color: phaseInfo.urgencyColor,
                fontWeight: "600",
              }}
            >
              {phaseInfo.urgencyLabel}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#FEF2F2",
              padding: 12,
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 11, color: "#991B1B", marginBottom: 4 }}>
              총 피해액 (참여자 합산 예상)
            </Text>
            <Text
              style={{ fontSize: 22, fontWeight: "700", color: "#DC2626" }}
            >
              {`₩${totalAmount.toLocaleString()}`}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="people" size={14} color="#3182F6" />
            <Text style={{ fontSize: 13, color: "#475569" }}>
              {`참여자 ${memberCount}명${isMember ? "" : " (참여 시)"}`}
            </Text>
          </View>
        </View>

        {/* 섹션 2: 멤버 목록 */}
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
              fontWeight: "600",
              color: "#475569",
              marginBottom: 10,
            }}
          >
            멤버 목록
          </Text>
          {group.members.map((m, idx) => {
            const isLeader = m.userId === group.leaderId;
            return (
              <View
                key={m.userId}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: "#F1F5F9",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#0F172A",
                    fontWeight: "500",
                  }}
                >
                  {m.nickname}
                </Text>
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                  {`· 미지급 ₩${m.amount.toLocaleString()}`}
                </Text>
                <View style={{ flex: 1 }} />
                {isLeader ? (
                  <View
                    style={{
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
                ) : m.isVolunteer ? (
                  <View
                    style={{
                      backgroundColor: "#E8F2FF",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#1B64DA",
                        fontWeight: "600",
                      }}
                    >
                      🙋 자원
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
          {!isMember ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: "#F1F5F9",
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#3182F6",
                  fontWeight: "700",
                }}
              >
                {nickname}
              </Text>
              <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                {`· 미지급 ₩${myAmount.toLocaleString()} (참여 시)`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 섹션 3: 대표자 선출 안내 (electing 상태만) */}
        {group.status === "electing" ? (
          <View
            style={{
              backgroundColor: "#FFFBEB",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#FDE68A",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#92400E",
                marginBottom: 6,
              }}
            >
              대표자를 모집 중이에요
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#78350F",
                lineHeight: 18,
                marginBottom: 4,
              }}
            >
              대표자는 통합 진정서를 작성하고 노동청에 대표 제출합니다.
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#78350F",
                lineHeight: 18,
                marginBottom: 10,
              }}
            >
              {volunteers.length > 1
                ? "자원자가 여럿이면 피해액이 가장 큰 분이 대표자가 됩니다."
                : "자원자가 없으면 피해액이 가장 큰 분이 자동 선출됩니다."}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginBottom: 8,
              }}
            >
              <Ionicons name="time-outline" size={13} color="#92400E" />
              <Text
                style={{ fontSize: 12, color: "#92400E", fontWeight: "600" }}
              >
                {`잔여 ${formatHoursRemaining(group.leaderElectionDeadline)}`}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "#92400E",
                fontWeight: "600",
                marginBottom: 14,
              }}
            >
              {electionStatusText}
            </Text>

            <Pressable
              onPress={handleVolunteer}
              disabled={isVolunteer}
              style={{
                backgroundColor: isVolunteer ? "#94A3B8" : "#3182F6",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                marginBottom: 8,
                opacity: isVolunteer ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {isVolunteer
                  ? "✓ 이미 자원하셨어요"
                  : "내가 대표자 할게요"}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleJoinAsMember}
              disabled={isMember}
              style={{
                backgroundColor: "#FFFFFF",
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: "#3182F6",
                opacity: isMember ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  color: "#3182F6",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {isMember
                  ? "✓ 이미 멤버로 참여 중"
                  : "멤버로만 참여할게요"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* 섹션 4: 그룹 채팅 진입점 */}
        <Pressable
          onPress={handleGroupChat}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "#E8F2FF",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="chatbubbles" size={20} color="#3182F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 14, fontWeight: "600", color: "#0F172A" }}
            >
              그룹 채팅
            </Text>
            <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
              증거자료 공유 · 일정 조율
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
              style={{ fontSize: 13, color: "#3182F6", fontWeight: "600" }}
            >
              바로가기
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#3182F6" />
          </View>
        </Pressable>

        {/* 참여 완료 후 다음 단계 안내 — 멤버일 때만, joinGroup 직후 자동 스크롤 도착지 */}
        {isMember ? (
          <View style={{ marginTop: 24 }}>
            <View
              style={{
                height: 0.5,
                backgroundColor: "#E0E0DC",
                marginBottom: 20,
              }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#111111",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              공동대응 그룹에 합류하셨어요! ✅
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#555555",
                lineHeight: 20,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {
                "이제 진정서를 작성할 차례예요.\n공동대응 그룹의 증거자료를 함께 활용할 수 있어요."
              }
            </Text>
            <Pressable
              onPress={() => {
                // 3단계 완료 처리 + 4단계로 진행 (joinGroup이 이미 진행했어도 idempotent).
                completeStep(caseId, "group_decision");
                setCurrentStep(caseId, "complaint_draft");
                onBack();
              }}
              style={{
                backgroundColor: "#1A5FAF",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
              >
                진정서 작성 시작하기 →
              </Text>
            </Pressable>
            <Pressable
              onPress={handleGroupChat}
              style={{
                backgroundColor: "#EBF3FF",
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                marginBottom: 12,
                borderWidth: 0.5,
                borderColor: "#B5D4F4",
              }}
            >
              <Text
                style={{ color: "#185FA5", fontSize: 14, fontWeight: "600" }}
              >
                💬 그룹 채팅 먼저 보기
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: 11,
                color: "#AAAAAA",
                textAlign: "center",
              }}
            >
              나중에 사건 상세에서도 그룹 현황을 확인할 수 있어요
            </Text>
          </View>
        ) : null}

        {/* 공동대응 탈퇴 — 본인이 멤버일 때만 노출 */}
        {isMember ? (
          <View
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTopWidth: 0.5,
              borderTopColor: "#E0E0DC",
              alignItems: "center",
            }}
          >
            {reportCase?.currentStep === "submission" ||
            reportCase?.currentStep === "investigation" ? (
              <View
                style={{
                  backgroundColor: "#F5F5F0",
                  borderRadius: 10,
                  padding: 14,
                  width: "100%",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#444444",
                    fontWeight: "500",
                    marginBottom: 4,
                  }}
                >
                  🔒 이미 진정서가 제출되어 그룹에서 탈퇴할 수 없습니다.
                </Text>
                <Text style={{ fontSize: 12, color: "#888888" }}>
                  탈퇴를 원하시면 담당 근로감독관에게 직접 연락하세요.
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={handleLeaveGroup}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#E24B4A",
                    textDecorationLine: "underline",
                  }}
                >
                  공동대응 탈퇴하기
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
