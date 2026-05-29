import { apiClient } from "@/shared/api/axios-instance";
import type { AttendanceRecord } from "../model/types";

/**
 * /api/working/** 인증 정책 (2026-05-29 기준):
 * - SecurityConfig permitAll 목록에 명시되지 않음 → JWT 검증 대상
 * - 다만 현재 컨트롤러들이 @AuthenticationPrincipal을 미사용 → 토큰 없어도 403 안 남
 * - 현재 코드는 apiClient(JWT 자동 첨부) 경유라 양쪽 모두 안전
 *
 * TODO: /api/working/** 인증 정책 변경 시 axios 인스턴스 점검 필요
 *   - 백엔드가 @AuthenticationPrincipal 도입 → apiClient 그대로 OK (토큰 자동 첨부됨)
 *   - SecurityConfig가 permitAll로 명시 → 변경 없음 (현재 동작과 동일)
 */

interface WorkingResponse {
  id: number;
  partTimeJobId: number;
  realStartTime: string | null;
  realEndTime: string | null;
  workingMinutes: number | null;
  inProgress: boolean;
}

/** ISO 시각 → "HH:MM" 변환. null/undefined면 undefined. */
function toTimeLabel(iso: string | null): string | undefined {
  if (iso === null) return undefined;
  const time = iso.split("T")[1];
  if (time === undefined) return undefined;
  return time.slice(0, 5);
}

function toAttendance(r: WorkingResponse): AttendanceRecord {
  const start = r.realStartTime ?? new Date().toISOString();
  const date = start.split("T")[0];
  const workedMinutes = r.workingMinutes ?? 0;
  return {
    id: String(r.id),
    workplaceId: String(r.partTimeJobId),
    workplaceName: "사업장 미상", // 백엔드 응답에 미포함 — Phase 2에서 workplace join 필요
    date,
    scheduledStart: "09:00", // 백엔드 응답에 미포함 — Phase 2에서 schedule join 필요
    scheduledEnd: "18:00",
    actualCheckIn: toTimeLabel(r.realStartTime),
    actualCheckOut: toTimeLabel(r.realEndTime),
    extendedMinutes: 0,
    workedMinutes,
    overtimeMinutes: Math.max(0, workedMinutes - 480),
    nightWorkedMinutes: 0,
    estimatedWage: 0,
    status: r.inProgress ? "working" : "checked-out",
  };
}

export async function fetchAttendances(
  workplaceId: string,
): Promise<AttendanceRecord[]> {
  // TODO: /api/working/** 인증 정책 변경 시 apiClient로 교체 필요
  const { data } = await apiClient.get<WorkingResponse[]>(
    `/working/history/${workplaceId}`,
  );
  return data.map(toAttendance);
}

export async function fetchTodayAttendance(
  workplaceId: string,
): Promise<AttendanceRecord | null> {
  // TODO: /api/working/** 인증 정책 변경 시 apiClient로 교체 필요
  const { data } = await apiClient.get<WorkingResponse | null>(
    `/working/current/${workplaceId}`,
  );
  return data ? toAttendance(data) : null;
}

export async function checkIn(
  workplaceId: string,
  bssid?: string,
): Promise<AttendanceRecord> {
  // TODO: /api/working/** 인증 정책 변경 시 apiClient로 교체 필요
  const { data } = await apiClient.post<WorkingResponse>("/working/clock-in", {
    partTimeJobId: Number(workplaceId),
    bssid: bssid ?? "",
  });
  return toAttendance(data);
}

export async function checkOut(
  attendanceId: string,
  bssid?: string,
): Promise<AttendanceRecord> {
  // TODO: /api/working/** 인증 정책 변경 시 apiClient로 교체 필요
  const { data } = await apiClient.post<WorkingResponse>("/working/clock-out", {
    workingId: Number(attendanceId),
    bssid: bssid ?? "",
  });
  return toAttendance(data);
}
