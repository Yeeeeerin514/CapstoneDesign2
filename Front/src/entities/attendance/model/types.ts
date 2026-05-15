export type AttendanceStatus = "checked-in" | "working" | "checked-out";

export interface AttendanceRecord {
  id: string;
  workplaceId: string;
  /** YYYY-MM-DD */
  date: string;
  /** ISO 출근 시각. */
  checkInAt: string;
  /** ISO 퇴근 시각. 근무 중이면 null. */
  checkOutAt: string | null;
  /** 휴게 제외 실근무 분. */
  workedMinutes: number;
  /** 8시간 초과 분. 수당 강조 표시용. */
  overtimeMinutes: number;
  /** 22:00~06:00 분. 야간수당 표시용. */
  nightWorkedMinutes: number;
  /** 자동 계산된 추정 일급(원). */
  estimatedWage: number;
  status: AttendanceStatus;
}
