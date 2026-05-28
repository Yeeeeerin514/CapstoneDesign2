import { apiClient } from "@/shared/api/axios-instance";
import type { AttendanceRecord } from "../model/types";

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
  const { data } = await apiClient.get<WorkingResponse[]>(
    `/working/history/${workplaceId}`,
  );
  return data.map(toAttendance);
}

export async function fetchTodayAttendance(
  workplaceId: string,
): Promise<AttendanceRecord | null> {
  const { data } = await apiClient.get<WorkingResponse | null>(
    `/working/current/${workplaceId}`,
  );
  return data ? toAttendance(data) : null;
}

export async function checkIn(
  workplaceId: string,
  bssid?: string,
): Promise<AttendanceRecord> {
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
  const { data } = await apiClient.post<WorkingResponse>("/working/clock-out", {
    workingId: Number(attendanceId),
    bssid: bssid ?? "",
  });
  return toAttendance(data);
}
