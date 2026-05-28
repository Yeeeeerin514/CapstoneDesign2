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
} from "../model/matching-types";

/** 멘토 등록/수정 */
export async function registerMentor(
  req: MentorRegistrationRequest,
): Promise<BackendMentorProfile> {
  const { data } = await apiClient.post<BackendMentorProfile>(
    "/mentoring/mentor-profile",
    req,
  );
  return data;
}

/** 내 멘토 프로필 조회 (없으면 null) */
export async function fetchMyMentorProfile(): Promise<BackendMentorProfile | null> {
  try {
    const { data } = await apiClient.get<BackendMentorProfile>(
      "/mentoring/mentor-profile/me",
    );
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * 매칭 요청 — Gower distance + Gale-Shapley + Thompson Sampling 적용.
 * 응답으로 top-K 멘토 + 항목별 기여도 + 사용 가중치 반환.
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

/** 멘티가 결제·동의 후 매칭 확정 (PROPOSED → ACTIVE) */
export async function confirmMatch(matchId: number): Promise<void> {
  await apiClient.post(`/mentoring/match/${matchId}/confirm`);
}

/** 매칭 종료 후 피드백 제출 — Thompson Sampling 학습 신호 */
export async function submitMatchingFeedback(
  payload: FeedbackPayload,
): Promise<void> {
  await apiClient.post("/mentoring/feedback", payload);
}

/** 내 매칭 이력 */
export async function fetchMyMatches(): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>("/mentoring/my-matches");
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
  senderRole: "MENTOR" | "MENTEE" | "SYSTEM";
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
  formData.append("file", file as Blob, "evidence");
  const { data } = await apiClient.post<{ url: string }>(
    "/mentoring/evidence/upload",
    formData,
    {
      // 웹: axios가 multipart 자동 헤더 / 네이티브에선 명시
      headers:
        typeof navigator !== "undefined" && navigator.product === "ReactNative"
          ? { "Content-Type": "multipart/form-data" }
          : {},
      timeout: 30_000,
    },
  );
  return data.url;
}
