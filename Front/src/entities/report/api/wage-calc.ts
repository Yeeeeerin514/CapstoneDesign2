import { apiClient } from "@/shared/api/axios-instance";

/**
 * GET /api/reports/wage-calc 응답 — 백엔드 캐논.
 * 모든 금액은 원 단위 정수. minutes/hours 동시 제공.
 */
export interface WageBreakdown {
  hourlyWage: number;
  totalWorkMinutes: number;
  totalWorkHours: number;
  basePay: number;
  weeklyHolidayPay: number;
  overtimePay: number;
  nightPay: number;
  totalShouldReceive: number;
  minimumWage: number;
}

/**
 * 임금 자동 계산 — 백엔드가 partTimeJobId 기반 근무 이력으로 계산.
 * hourlyWage 생략 시 백엔드가 최저시급 또는 contract 시급 사용.
 * 인증 필요 (apiClient).
 */
export async function fetchWageCalc(
  partTimeJobId: number,
  hourlyWage?: number,
): Promise<WageBreakdown> {
  const params: Record<string, number> = { partTimeJobId };
  if (hourlyWage !== undefined && hourlyWage > 0) params.hourlyWage = hourlyWage;
  const { data } = await apiClient.get<WageBreakdown>("/reports/wage-calc", {
    params,
  });
  return data;
}
