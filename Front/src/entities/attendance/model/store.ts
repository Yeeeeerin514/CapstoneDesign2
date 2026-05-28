import { create } from "zustand";
import type { AttendanceRecord, AttendanceStats } from "./types";
import {
  MOCK_ACTIVE_SESSION,
  MOCK_RECENT_ATTENDANCES,
  MOCK_STATS,
} from "./mock-data";

type WorkState = "before-work" | "working" | "after-work";

interface AttendanceStoreState {
  workState: WorkState;
  activeSession: AttendanceRecord | null;
  recentAttendances: AttendanceRecord[];
  stats: AttendanceStats;

  simulateCheckIn: () => void;
  simulateCheckOut: () => void;
  simulateReset: () => void;
  tickWorkedMinutes: () => void;
}

function nowHHMM(): string {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function todayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAttendanceStore = create<AttendanceStoreState>((set, get) => ({
  workState: MOCK_ACTIVE_SESSION !== null ? "working" : "before-work",
  activeSession: MOCK_ACTIVE_SESSION,
  recentAttendances: MOCK_RECENT_ATTENDANCES,
  stats: MOCK_STATS,

  simulateCheckIn: () => {
    set({
      workState: "working",
      activeSession: {
        id: `att-${Date.now()}`,
        workplaceId: "wp-1",
        workplaceName: "xx카페 강남점",
        date: todayYMD(),
        scheduledStart: "09:00",
        scheduledEnd: "18:00",
        actualCheckIn: nowHHMM(),
        extendedMinutes: 0,
        workedMinutes: 0,
        overtimeMinutes: 0,
        nightWorkedMinutes: 0,
        estimatedWage: 0,
        status: "working",
      },
    });
  },

  simulateCheckOut: () => {
    const current = get().activeSession;
    if (current === null) return;
    set({
      workState: "after-work",
      activeSession: {
        ...current,
        actualCheckOut: nowHHMM(),
        status: "checked-out",
      },
    });
  },

  simulateReset: () => {
    set({
      workState: MOCK_ACTIVE_SESSION !== null ? "working" : "before-work",
      activeSession: MOCK_ACTIVE_SESSION,
    });
  },

  tickWorkedMinutes: () => {
    const current = get().activeSession;
    if (current === null || get().workState !== "working") return;
    set({
      activeSession: { ...current, workedMinutes: current.workedMinutes + 1 },
    });
  },
}));
