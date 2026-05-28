import { create } from "zustand";
import type {
  MentorBadge,
  MentorChatMessage,
  MentorMatch,
} from "@/entities/mentor";

interface CreateMatchParams {
  caseId: string;
  menteeId: string;
  mentorId: string;
  mentorNickname: string;
  mentorBadges: MentorBadge[];
  mentorIndustry: string;
}

interface MentorMatchState {
  matches: MentorMatch[];

  /** 결제 완료 직후 호출. 시스템 메시지 + 멘토 인삿말 자동 삽입한 match를 반환. */
  createMatch: (params: CreateMatchParams) => MentorMatch;

  /** 채팅 메시지 추가. last* 필드 자동 갱신. id는 store에서 부여. */
  addMessage: (
    matchId: string,
    message: Omit<MentorChatMessage, "id">,
  ) => void;

  getMatchById: (matchId: string) => MentorMatch | undefined;
  /** 사건 상세 "연결된 멘토" 섹션 — active 매칭만. */
  getMatchesByCase: (caseId: string) => MentorMatch[];
  /** MY 탭 — lastMessageAt(없으면 matchedAt) 기준 내림차순. */
  getMatchesByMentee: (menteeId: string) => MentorMatch[];
}

export const useMentorMatchStore = create<MentorMatchState>((set, get) => ({
  matches: [],

  createMatch: ({
    caseId,
    menteeId,
    mentorId,
    mentorNickname,
    mentorBadges,
    mentorIndustry,
  }) => {
    const now = new Date();
    const id = `match-${now.getTime()}`;
    const newMatch: MentorMatch = {
      id,
      caseId,
      menteeId,
      mentorId,
      mentorNickname,
      mentorBadges,
      mentorIndustry,
      matchedAt: now.toISOString(),
      status: "active",
      chatMessages: [
        {
          id: `sys-${now.getTime()}`,
          senderId: "system",
          senderRole: "system",
          text: `${mentorNickname} 멘토와 매칭되었습니다. 실명은 공개되지 않으며, 채팅 내용은 상담 목적으로만 사용됩니다.`,
          timestamp: now.toISOString(),
        },
        {
          id: `mentor-intro-${now.getTime()}`,
          senderId: mentorId,
          senderRole: "mentor",
          text: "안녕하세요! 저도 비슷한 상황을 겪었어요. 어떤 부분이 가장 막막하세요?",
          timestamp: new Date(now.getTime() + 1000).toISOString(),
        },
      ],
    };
    set((state) => ({ matches: [...state.matches, newMatch] }));
    return newMatch;
  },

  addMessage: (matchId, message) => {
    const id = `msg-${Date.now()}`;
    const newMsg: MentorChatMessage = { ...message, id };
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              chatMessages: [...m.chatMessages, newMsg],
              lastMessageAt: newMsg.timestamp,
              lastMessagePreview: newMsg.text.slice(0, 30),
            }
          : m,
      ),
    }));
  },

  getMatchById: (matchId) => get().matches.find((m) => m.id === matchId),

  getMatchesByCase: (caseId) =>
    get().matches.filter(
      (m) => m.caseId === caseId && m.status === "active",
    ),

  getMatchesByMentee: (menteeId) =>
    [...get().matches.filter((m) => m.menteeId === menteeId)].sort((a, b) =>
      (b.lastMessageAt ?? b.matchedAt).localeCompare(
        a.lastMessageAt ?? a.matchedAt,
      ),
    ),
}));
