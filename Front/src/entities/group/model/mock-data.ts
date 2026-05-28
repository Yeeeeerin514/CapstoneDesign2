import type { Group } from "./types";

export const MOCK_GROUPS: Group[] = [
  {
    id: "group-001",
    workplaceName: "OO카페 강남점",
    businessRegistrationNumber: null,
    members: [
      {
        userId: "user-seed-01",
        caseId: "case-seed-01",
        nickname: "닉네임A",
        amount: 980000,
        isVolunteer: true,
        joinedAt: "2026-05-20T10:00:00Z",
      },
      {
        userId: "user-seed-02",
        caseId: "case-seed-02",
        nickname: "닉네임B",
        amount: 650000,
        isVolunteer: false,
        joinedAt: "2026-05-21T09:00:00Z",
      },
    ],
    leaderId: null,
    leaderElectionDeadline: "2026-05-25T10:00:00Z",
    status: "electing",
    createdAt: "2026-05-20T10:00:00Z",
    recruitingDeadline: null,
    submissionDeadline: "2026-06-01T10:00:00Z",
    chatMessages: [
      {
        id: "sys-001",
        senderId: "system",
        text: "OO카페 강남점 공동대응 채팅방이 열렸어요",
        timestamp: "2026-05-20T14:00:00Z",
        system: true,
      },
      {
        id: "msg-001",
        senderId: "user-seed-01",
        text: "안녕하세요, 저희 같이 잘 해봐요. 진정서는 제가 정리해서 공유드릴게요.",
        timestamp: "2026-05-20T14:08:00Z",
      },
      {
        id: "msg-002",
        senderId: "user-seed-02",
        text: "감사합니다. 저는 통장 사본까지 준비됐어요.",
        timestamp: "2026-05-20T14:12:00Z",
      },
      {
        id: "msg-003",
        senderId: "user-seed-02",
        text: "혹시 출석조사 날짜는 언제쯤 잡힐까요?",
        timestamp: "2026-05-21T09:21:00Z",
      },
    ],
  },
];
