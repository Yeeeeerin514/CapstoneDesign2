export interface GroupMember {
  userId: string;
  caseId: string;
  nickname: string;
  /** 피해 금액(원). */
  amount: number;
  /** 대표자 자원 여부. */
  isVolunteer: boolean;
  /** ISO date string. */
  joinedAt: string;
}

export type GroupStatus = "recruiting" | "electing" | "active" | "closed";

/**
 * 공동대응 그룹 1:N 채팅 메시지.
 * 메시지는 Group 안에 영구 저장 — 어떤 진입점(사건 상세 / 진행단계 / 본문 / GroupJoinView)에서
 * 채팅을 열어도 같은 이력이 보임. 멘토 채팅(MentorChatMessage)과 동일한 패턴.
 */
export interface GroupChatMessage {
  id: string;
  /** 발화자 userId. 시스템 메시지는 'system'. */
  senderId: string;
  text: string;
  /** ISO date string. */
  timestamp: string;
  /** 시스템 메시지(채팅방 개설 / 대표자 선출 안내 등). */
  system?: boolean;
}

export interface Group {
  id: string;
  workplaceName: string;
  businessRegistrationNumber: string | null;
  members: GroupMember[];
  leaderId: string | null;
  /** ISO date string (그룹 생성 후 48시간). */
  leaderElectionDeadline: string;
  status: GroupStatus;
  createdAt: string;
  /** 그룹 모집 마감 — null이면 상시 모집(`recruiting`/`electing`/`active` 모두 가능). */
  recruitingDeadline: string | null;
  /** 진정서 제출 권장 마감 — 대표자 선출 후 +7일. */
  submissionDeadline: string;
  /** 진정서 제출 완료 시각 (active → submitted 전환 트리거). */
  submittedAt?: string;

  /** 그룹 채팅 메시지 — 모든 진입점에서 동일 이력 공유. */
  chatMessages: GroupChatMessage[];
}

export type GroupPhase =
  | "recruiting"
  | "electing"
  | "submitting"
  | "submitted"
  | "closed";

export interface GroupPhaseInfo {
  phase: GroupPhase;
  urgencyLabel: string;
  /** Hex 색상 — 잔여 시간/일수에 따라 빨강/주황/파랑/초록 분기. */
  urgencyColor: string;
}

/**
 * 현재 그룹 상태 + 잔여 시간/일수 기반 긴급도 산출.
 * 화면에 표시할 라벨/색상까지 한 번에 결정.
 */
export function getGroupPhase(group: Group): GroupPhaseInfo {
  const now = Date.now();
  const electionDeadline = new Date(group.leaderElectionDeadline).getTime();
  const electionHoursLeft = Math.max(
    0,
    Math.ceil((electionDeadline - now) / 3600000),
  );

  if (group.status === "recruiting") {
    return {
      phase: "recruiting",
      urgencyLabel: `${group.members.length}명 참여 중 · 상시 모집`,
      urgencyColor: "#185FA5",
    };
  }
  if (group.status === "electing") {
    return {
      phase: "electing",
      urgencyLabel: `대표자 선출 중 · ${electionHoursLeft}시간 남음`,
      urgencyColor: electionHoursLeft < 12 ? "#E24B4A" : "#BA7517",
    };
  }
  if (group.status === "active" && group.submittedAt === undefined) {
    const subDeadline = new Date(group.submissionDeadline).getTime();
    const subDaysLeft = Math.max(
      0,
      Math.ceil((subDeadline - now) / 86400000),
    );
    return {
      phase: "submitting",
      urgencyLabel: `진정서 제출까지 ${subDaysLeft}일 남음`,
      urgencyColor: subDaysLeft <= 2 ? "#E24B4A" : "#0F6E56",
    };
  }
  if (group.status === "closed") {
    return {
      phase: "closed",
      urgencyLabel: "사건 종결",
      urgencyColor: "#94A3B8",
    };
  }
  return {
    phase: "submitted",
    urgencyLabel: "진정서 제출 완료",
    urgencyColor: "#0F6E56",
  };
}
