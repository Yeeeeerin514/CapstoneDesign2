import { apiClient } from "@/shared/api/axios-instance";
import type { AttendanceRecord } from "../model/types";

export async function fetchAttendances(
  workplaceId: string,
): Promise<AttendanceRecord[]> {
  const { data } = await apiClient.get<AttendanceRecord[]>(
    `/workplaces/${workplaceId}/attendances`,
  );
  return data;
}

export async function fetchTodayAttendance(
  workplaceId: string,
): Promise<AttendanceRecord | null> {
  const { data } = await apiClient.get<AttendanceRecord | null>(
    `/workplaces/${workplaceId}/attendances/today`,
  );
  return data;
}

export async function checkIn(workplaceId: string): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<AttendanceRecord>(
    `/workplaces/${workplaceId}/check-in`,
  );
  return data;
}

export async function checkOut(
  attendanceId: string,
  overtimeMinutes = 0,
): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<AttendanceRecord>(
    `/attendances/${attendanceId}/check-out`,
    { overtimeMinutes },
  );
  return data;
}
