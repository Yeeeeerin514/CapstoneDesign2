import { create } from "zustand";
import type { AttendanceRecord, AttendanceStats } from "./types";
import {
  checkIn as apiCheckIn,
  checkOut as apiCheckOut,
  fetchAttendances,
  fetchCurrentWorking,
} from "../api/fetch-attendances";

type WorkState = "before-work" | "working" | "after-work";

const EMPTY_STATS: AttendanceStats = {
  weeklyWorkedHours: 0,
  weeklyWage: 0,
  weeklyWorkDays: 0,
  weeklyTargetHours: 40,
};

interface AttendanceStoreState {
  workState: WorkState;
  activeSession: AttendanceRecord | null;
  recentAttendances: AttendanceRecord[];
  stats: AttendanceStats;
  isLoading: boolean;

  /** 백엔드에서 현재 상태 + 이력 로드 → state 구성. */
  load: (partTimeJobId: number, hourlyWage: number) => Promise<void>;
  /** 실제 출근 — 등록된 BSSID로 /working/clock-in 호출. */
  clockIn: (partTimeJobId: number, bssid: string, hourlyWage: number) => Promise<void>;
  /** 실제 퇴근 — /working/clock-out 호출. */
  clockOut: (bssid: string, hourlyWage: number) => Promise<void>;
  /** 출근 중 라이브 경과(분) 증분 (UI용). */
  tickWorkedMinutes: () => void;
  reset: () => void;
}

function mondayStartMs(): number {
  const now = new Date();
  const dayFromMon = (now.getDay() + 6) % 7; // 월=0 ... 일=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayFromMon);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

function recordTimeMs(r: AttendanceRecord): number {
  return r.actualCheckInIso !== undefined
    ? new Date(r.actualCheckInIso).getTime()
    : new Date(r.date).getTime();
}

/** 시급 기반으로 일급(estimatedWage) 보강. */
function withWage(
  records: AttendanceRecord[],
  hourlyWage: number,
): AttendanceRecord[] {
  return records.map((r) => ({
    ...r,
    estimatedWage:
      r.estimatedWage > 0
        ? r.estimatedWage
        : Math.round((r.workedMinutes / 60) * hourlyWage),
  }));
}

function computeStats(
  records: AttendanceRecord[],
  hourlyWage: number,
): AttendanceStats {
  const monday = mondayStartMs();
  const week = records.filter((r) => recordTimeMs(r) >= monday);
  const minutes = week.reduce((acc, r) => acc + r.workedMinutes, 0);
  const days = new Set(week.map((r) => r.date)).size;
  return {
    weeklyWorkedHours: Math.round((minutes / 60) * 10) / 10,
    weeklyWage: Math.round((minutes / 60) * hourlyWage),
    weeklyWorkDays: days,
    weeklyTargetHours: 40,
  };
}

export const useAttendanceStore = create<AttendanceStoreState>((set, get) => ({
  workState: "before-work",
  activeSession: null,
  recentAttendances: [],
  stats: EMPTY_STATS,
  isLoading: false,

  load: async (partTimeJobId, hourlyWage) => {
    set({ isLoading: true });
    try {
      const [current, records] = await Promise.all([
        fetchCurrentWorking(partTimeJobId).catch(() => null),
        fetchAttendances(String(partTimeJobId)).catch(() => [] as AttendanceRecord[]),
      ]);
      const withW = withWage(records, hourlyWage);
      set({
        activeSession: current,
        workState: current !== null ? "working" : "before-work",
        recentAttendances: withW,
        stats: computeStats(withW, hourlyWage),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  clockIn: async (partTimeJobId, bssid, hourlyWage) => {
    const session = await apiCheckIn(String(partTimeJobId), bssid);
    if (session !== null) {
      set({ workState: "working", activeSession: session });
    }
    await get().load(partTimeJobId, hourlyWage);
  },

  clockOut: async (bssid, hourlyWage) => {
    const session = get().activeSession;
    if (session === null) return;
    await apiCheckOut(session.id, bssid);
    const ptjId = Number(session.workplaceId);
    set({ workState: "after-work", activeSession: null });
    if (!Number.isNaN(ptjId)) {
      await get().load(ptjId, hourlyWage);
    }
  },

  tickWorkedMinutes: () => {
    const current = get().activeSession;
    if (current === null || get().workState !== "working") return;
    set({
      activeSession: { ...current, workedMinutes: current.workedMinutes + 1 },
    });
  },

  reset: () => set({ workState: "before-work", activeSession: null }),
}));
