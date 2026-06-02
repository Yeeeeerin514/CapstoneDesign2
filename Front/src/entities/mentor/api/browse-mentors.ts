import { apiClient } from "@/shared/api/axios-instance";
import type { MentorProfile } from "../model/types";

/**
 * `GET /api/mentoring/mentors` — 매칭 추천(Top-3) 외에 사용자가 전체 멘토에서
 * 직접 골라야 할 때. 백엔드 통신 문서(2026-05-30) §2.5.
 *
 * 필터는 모두 optional. 인덱스 0-based 페이지네이션.
 */
export interface BrowseMentorsParams {
  industry?: string;
  /** comma-separated damageTypes 으로 직렬화 (백엔드 매핑). */
  damageTypes?: string[];
  region?: string;
  q?: string;
  page?: number;
  size?: number;
}

export interface BrowseMentorsResponse {
  mentors: MentorProfile[];
  total: number;
  page: number;
  size: number;
}

export async function browseMentors(
  params: BrowseMentorsParams,
): Promise<BrowseMentorsResponse> {
  const { damageTypes, ...rest } = params;
  const { data } = await apiClient.get<BrowseMentorsResponse>(
    "/mentoring/mentors",
    {
      params: {
        ...rest,
        damageTypes:
          damageTypes !== undefined && damageTypes.length > 0
            ? damageTypes.join(",")
            : undefined,
      },
    },
  );
  return data;
}
