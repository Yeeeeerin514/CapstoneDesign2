import { create } from "zustand";
import {
  MOCK_GROUPS,
  type Group,
  type GroupChatMessage,
  type GroupMember,
} from "@/entities/group";

interface GroupState {
  groups: Group[];

  /** 같은 업장에 이미 그룹이 있는지 탐색. */
  findGroupByWorkplace: (workplaceName: string) => Group | undefined;

  /** 본인이 이미 그룹 멤버인지 확인. */
  isAlreadyMember: (groupId: string, userId: string) => boolean;

  /** 그룹 참여 — 본인을 멤버로 추가. */
  joinGroup: (groupId: string, member: GroupMember) => void;

  /** 대표자 자원 (isVolunteer=true 마킹). */
  volunteerAsLeader: (groupId: string, userId: string) => void;

  /**
   * 대표자 확정.
   * 규칙: 자원자가 있으면 자원자 중 피해액 최대자, 없으면 전체 중 피해액 최대자.
   * status → 'active'로 전환.
   */
  electLeader: (groupId: string) => void;

  /**
   * 48시간 타이머 만료 자동 선출.
   * 화면 진입 시마다 호출. electing이고 leaderId가 null인데 마감 지났으면 electLeader 호출.
   */
  checkAndAutoElect: (groupId: string) => void;

  /** 진정서 제출 완료 — submittedAt 채움 (active → submitted 표시). */
  markSubmitted: (groupId: string, submittedAt: string) => void;

  /**
   * 멤버 탈퇴 — 본인을 members에서 제거.
   * 탈퇴자가 대표자였으면 자원자(피해액 최대) > 전체(피해액 최대) 순으로 자동 재선출.
   * 모든 멤버가 빠지면 status='closed'.
   */
  leaveGroup: (groupId: string, userId: string) => void;

  /**
   * 그룹 채팅 메시지 추가. 어느 진입점에서 send하든 같은 group.chatMessages에 누적되어
   * 다른 진입점에서도 동일 이력이 보임. id는 store가 부여.
   */
  addGroupChatMessage: (
    groupId: string,
    message: Omit<GroupChatMessage, "id">,
  ) => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: MOCK_GROUPS,

  findGroupByWorkplace: (workplaceName) =>
    get().groups.find((g) => g.workplaceName === workplaceName),

  isAlreadyMember: (groupId, userId) => {
    const group = get().groups.find((g) => g.id === groupId);
    return group?.members.some((m) => m.userId === userId) ?? false;
  },

  joinGroup: (groupId, member) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, members: [...g.members, member] } : g,
      ),
    }));
    // 3단계(group_decision) 자동 완료 + 4단계(complaint_draft) 진행.
    // useReportStore 정적 import 시 순환 의존 위험 → 런타임 require로 회피.
    try {
      const { useReportStore } = require("@/features/report-submit") as {
        useReportStore: {
          getState: () => {
            cases: { id: string; workplaceName: string; currentStep: string }[];
            completeStep: (caseId: string, stepId: "group_decision") => void;
            setCurrentStep: (caseId: string, stepId: "complaint_draft") => void;
          };
        };
      };
      const rs = useReportStore.getState();
      const group = get().groups.find((g) => g.id === groupId);
      if (group === undefined) return;
      const matchingCase = rs.cases.find(
        (c) => c.workplaceName === group.workplaceName,
      );
      if (matchingCase === undefined) return;
      // 이미 진정서 작성 이후 단계라면 되돌리지 않음 — group_decision일 때만 진행.
      if (matchingCase.currentStep === "group_decision") {
        rs.completeStep(matchingCase.id, "group_decision");
        rs.setCurrentStep(matchingCase.id, "complaint_draft");
      }
    } catch {
      // 순환/import 실패 시 조용히 무시 — 그룹 참여 자체는 성공.
    }
  },

  volunteerAsLeader: (groupId, userId) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: g.members.map((m) =>
                m.userId === userId ? { ...m, isVolunteer: true } : m,
              ),
            }
          : g,
      ),
    })),

  electLeader: (groupId) =>
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId) return g;
        const volunteers = g.members.filter((m) => m.isVolunteer);
        const candidatePool = volunteers.length > 0 ? volunteers : g.members;
        const sorted = [...candidatePool].sort((a, b) => b.amount - a.amount);
        const newLeader = sorted[0];
        return {
          ...g,
          leaderId: newLeader?.userId ?? null,
          status: "active",
        };
      }),
    })),

  checkAndAutoElect: (groupId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (group === undefined) return;
    if (group.status !== "electing") return;
    if (group.leaderId !== null) return;
    const deadline = new Date(group.leaderElectionDeadline).getTime();
    if (Date.now() >= deadline) {
      get().electLeader(groupId);
    }
  },

  markSubmitted: (groupId, submittedAt) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, submittedAt } : g,
      ),
    })),

  leaveGroup: (groupId, userId) =>
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId) return g;
        const remaining = g.members.filter((m) => m.userId !== userId);
        const wasLeader = g.leaderId === userId;
        let newLeaderId = g.leaderId;
        if (wasLeader) {
          // 자원자 중 피해액 최대자 우선, 없으면 전체 중 피해액 최대자.
          const volunteers = remaining.filter((m) => m.isVolunteer);
          const pool = volunteers.length > 0 ? volunteers : remaining;
          const sorted = [...pool].sort((a, b) => b.amount - a.amount);
          newLeaderId = sorted[0]?.userId ?? null;
        }
        return {
          ...g,
          members: remaining,
          leaderId: newLeaderId,
          status: remaining.length === 0 ? "closed" : g.status,
        };
      }),
    })),

  addGroupChatMessage: (groupId, message) => {
    const id = `gmsg-${Date.now()}`;
    const fullMessage: GroupChatMessage = { ...message, id };
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? { ...g, chatMessages: [...g.chatMessages, fullMessage] }
          : g,
      ),
    }));
  },
}));
