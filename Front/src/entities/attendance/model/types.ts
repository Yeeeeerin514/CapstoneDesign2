export type AttendanceStatus =
  | "scheduled"
  | "checked-in"
  | "working"
  | "checked-out";

export interface AttendanceRecord {
  id: string;
  workplaceId: string;
  workplaceName: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" — 예정 출근 시각. */
  scheduledStart: string;
  /** "HH:MM" — 예정 퇴근 시각. */
  scheduledEnd: string;
  /** "HH:MM" — 실제 출근 시각. 미출근이면 undefined. */
  actualCheckIn?: string;
  /** ISO 출근 시각 — 라이브 세션 경과 계산용. mock/실서버 모두 채움. */
  actualCheckInIso?: string;
  /** "HH:MM" — 실제 퇴근 시각. 근무 중이면 undefined. */
  actualCheckOut?: string;
  /** 연장근무 분 (기본 0). */
  extendedMinutes: number;
  /** 실제 근무한 총 분. */
  workedMinutes: number;
  /** 8시간 초과분. */
  overtimeMinutes: number;
  /** 22:00 ~ 06:00 야간근무 분. */
  nightWorkedMinutes: number;
  /** 일급 예상 (원). */
  estimatedWage: number;
  status: AttendanceStatus;
}

/** 주간 통계 — 대시보드 표시용. */
export interface AttendanceStats {
  /** 이번주 총 근무시간. */
  weeklyWorkedHours: number;
  /** 이번주 총 수당 (원). */
  weeklyWage: number;
  /** 이번주 출근 일수. */
  weeklyWorkDays: number;
  /** 주간 목표 시간 (기본 40). */
  weeklyTargetHours: number;
}
