import { apiClient } from "./axios-instance";

/**
 * GET /api/minimum-wage?year=YYYY
 * permitAll — 인증 불필요. 범위(2020~2030) 밖은 가장 가까운 연도 반환.
 */
export interface MinimumWageResponse {
  year: number;
  hourlyWage: number;
  /** "YYYY-MM-DD" 적용 시작일. */
  effectiveFrom: string;
}

export async function fetchMinimumWage(
  year?: number,
): Promise<MinimumWageResponse> {
  const { data } = await apiClient.get<MinimumWageResponse>("/minimum-wage", {
    params: year !== undefined ? { year } : {},
  });
  return data;
}
