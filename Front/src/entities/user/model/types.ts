export type UserRole = "mentee" | "mentor" | "admin";

export interface User {
  id: string;
  nickname: string;
  role: UserRole;
  /** 임금체불 해결 성공 인증 여부 — 멘토 등록 자격. */
  isResolutionVerified: boolean;
  /** ISO 가입 시각. */
  joinedAt: string;
}
