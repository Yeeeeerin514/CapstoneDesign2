import { apiClient } from "@/shared/api/axios-instance";
import type { BusinessSearchResponse } from "../model/types";

/**
 * 사업장 검색 — `GET /api/businesses/search?q=&region=`.
 * 백엔드 통신 문서(2026-05-30) §2.1.
 *
 * 결과 0건이면 빈 배열 반환 — 화면은 "직접 입력" fallback으로 분기.
 */
export async function searchBusinesses(params: {
  q: string;
  region: string;
}): Promise<BusinessSearchResponse> {
  const { data } = await apiClient.get<BusinessSearchResponse>(
    "/businesses/search",
    { params },
  );
  return data;
}
