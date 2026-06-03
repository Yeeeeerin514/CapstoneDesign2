/**
 * 백엔드 매칭 시스템 API 클라이언트.
 * 백엔드: /api/mentoring/**
 */
import { apiClient } from "@/shared/api/axios-instance";
import type {
  BackendMentorProfile,
  FeedbackPayload,
  MatchRequestPayload,
  MatchResponseEnvelope,
  MentorRegistrationRequest,
  MentorshipMatch,
} from "../model/matching-types";

/**
 * POST /api/mentoring/match-request
 * 사건 컨텍스트를 보내고 top-K 매칭 결과를 받음. 백엔드가 Gower distance +
 * Gale-Shapley + Thompson Sampling으로 계산.
 */
export async function requestMatch(
  payload: MatchRequestPayload,
): Promise<MatchResponseEnvelope> {
  const { data } = await apiClient.post<MatchResponseEnvelope>(
    "/mentoring/match-request",
    payload,
  );
  return data;
}

/**
 * POST /api/mentoring/match/{matchId}/confirm
 * PROPOSED 상태 매칭을 ACTIVE로 전환. 사용자가 결제하고 멘토를 확정할 때 호출.
 */
export async function confirmMatch(matchId: number): Promise<MentorshipMatch> {
  const { data } = await apiClient.post<MentorshipMatch>(
    `/mentoring/match/${matchId}/confirm`,
  );
  return data;
}

/**
 * POST /api/mentoring/feedback — 매칭 종료 후 별점/해결여부 (Thompson Sampling 학습).
 * 백엔드 FeedbackRequest: { matchId, rating, chatDays, resolved, comment }
 */
export async function submitMatchFeedback(
  matchId: number,
  payload: FeedbackPayload,
): Promise<void> {
  await apiClient.post("/mentoring/feedback", {
    matchId,
    rating: payload.rating,
    comment: payload.comment ?? "",
    resolved: payload.resolved ?? false,
    chatDays: 0,
  });
}

/** GET /api/mentoring/mentor-profile/me — 내 멘토 프로필 조회. */
export async function fetchMentorProfileById(
  _userId: number,
): Promise<BackendMentorProfile> {
  const { data } = await apiClient.get<BackendMentorProfile>(
    "/mentoring/mentor-profile/me",
  );
  return data;
}

/** POST /api/mentoring/mentor-profile — 멘토 신규 등록/수정 (자격 증빙 첨부). */
export async function registerMentor(
  payload: MentorRegistrationRequest,
): Promise<BackendMentorProfile> {
  const { data } = await apiClient.post<BackendMentorProfile>(
    "/mentoring/mentor-profile",
    payload,
  );
  return data;
}

/** 발표/모니터링용 — Thompson Sampling 가중치 현재 분포 */
export async function fetchMatchingWeights(): Promise<{
  snapshot: Record<string, { alpha: number; beta: number; expected: number }>;
  expectedWeights: Record<string, number>;
  sampledOnce: Record<string, number>;
}> {
  const { data } = await apiClient.get("/mentoring/weights");
  return data;
}

export interface BackendChatMessage {
  id: number;
  matchId: number;
  senderUserId: number | null;
  senderRole: "MENTOR" | "MENTEE";
  text: string;
  createdAt: string;
}

/** 매칭 채팅 메시지 가져오기 — since(ISO)부터 증분만 가져옴. */
export async function fetchChatMessages(
  matchId: number,
  since?: string,
): Promise<BackendChatMessage[]> {
  const url = since !== undefined
    ? `/mentoring/match/${matchId}/messages?since=${encodeURIComponent(since)}`
    : `/mentoring/match/${matchId}/messages`;
  const { data } = await apiClient.get<BackendChatMessage[]>(url);
  return data;
}

/** 채팅 메시지 전송 — 발신자 role은 백엔드가 결정 (mentee/mentor). */
export async function sendChatMessage(
  matchId: number,
  text: string,
): Promise<BackendChatMessage> {
  const { data } = await apiClient.post<BackendChatMessage>(
    `/mentoring/match/${matchId}/messages`,
    { text },
  );
  return data;
}

/**
 * 멘토 자격 증빙 자료 S3 업로드.
 * @param file  이미지/PDF MultipartFile
 * @returns S3 public URL (mentor-evidence/ 폴더)
 */
export async function uploadMentorEvidence(file: File | Blob): Promise<string> {
  const formData = new FormData();
  // 네이티브에선 {uri,type,name} 객체가 file로 들어옴
  formData.append("file", file as Blob);
  const { data } = await apiClient.post<{ url: string }>(
    "/mentoring/evidence/upload",
    formData,
  );
  return data.url;
}
