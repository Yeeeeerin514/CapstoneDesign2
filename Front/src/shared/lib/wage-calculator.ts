/**
 * 수당 자동 계산 — 도메인 무관 순수 함수.
 * README 명세:
 *  - 기본급: 총 근무시간 × 시급
 *  - 연장수당: 8시간 초과분 × 시급 × 1.5
 *  - 야간수당: 22:00~06:00 근무분 × 시급 × 0.5 추가
 *  - 주휴수당: 주 15시간 이상 근무 시 1일치 임금 자동 추가
 *  - 최저임금 미달 시 경고 (2026년 기준: 10,030원/시)
 */

/** 2026년 최저시급 (원/시). 매년 갱신 필요. */
export const MINIMUM_WAGE_2026 = 10_030;

/** 1일 법정근로시간 (분). */
const DAILY_LEGAL_MINUTES = 8 * 60;
/** 1주 주휴수당 발생 최소 근무시간 (분). */
const WEEKLY_HOLIDAY_THRESHOLD_MINUTES = 15 * 60;

export interface DailyShift {
  /** 휴게시간을 제외한 총 실근무 분. */
  workedMinutes: number;
  /** 22:00 ~ 익일 06:00 구간에 포함된 근무 분 (workedMinutes의 부분집합). */
  nightWorkedMinutes: number;
}

export interface WageBreakdown {
  basePay: number;
  overtimePay: number;
  nightPay: number;
  total: number;
  isBelowMinimum: boolean;
}

/**
 * 일일 임금 분해.
 * - basePay: 8시간 이하 분에 대한 기본급.
 * - overtimePay: 8시간 초과분 × 1.5배.
 * - nightPay: 야간 시간대 근무분 × 0.5배 가산 (기본급 위에 얹는 형태).
 */
export function calcDailyWage(
  hourlyWage: number,
  shift: DailyShift,
): WageBreakdown {
  const baseMinutes = Math.min(shift.workedMinutes, DAILY_LEGAL_MINUTES);
  const overtimeMinutes = Math.max(0, shift.workedMinutes - DAILY_LEGAL_MINUTES);
  const nightMinutes = Math.max(
    0,
    Math.min(shift.nightWorkedMinutes, shift.workedMinutes),
  );

  const basePay = (baseMinutes / 60) * hourlyWage;
  const overtimePay = (overtimeMinutes / 60) * hourlyWage * 1.5;
  const nightPay = (nightMinutes / 60) * hourlyWage * 0.5;

  return {
    basePay,
    overtimePay,
    nightPay,
    total: basePay + overtimePay + nightPay,
    isBelowMinimum: hourlyWage < MINIMUM_WAGE_2026,
  };
}

/**
 * 주휴수당 계산.
 * - 주 15시간 이상 근무 시 1일치 임금을 추가 지급.
 * - "1일치"는 (1주 총 근무시간 ÷ 1주 소정근로일수)로 산정, 8시간 한도.
 */
export function calcWeeklyHolidayAllowance(
  hourlyWage: number,
  weeklyWorkedMinutes: number,
  workingDaysPerWeek: number,
): number {
  if (weeklyWorkedMinutes < WEEKLY_HOLIDAY_THRESHOLD_MINUTES) return 0;
  const days = Math.max(1, workingDaysPerWeek);
  const avgDailyMinutes = Math.min(
    DAILY_LEGAL_MINUTES,
    weeklyWorkedMinutes / days,
  );
  return (avgDailyMinutes / 60) * hourlyWage;
}
