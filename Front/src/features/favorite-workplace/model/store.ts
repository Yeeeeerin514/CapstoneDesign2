import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/shared/lib/zustand-storage";
import type { ContractAnalysisResult } from "@/entities/job-post";

export interface FavoriteWorkplace {
  id: string;
  name: string;
  contractStatus: "none" | "uploaded" | "analyzed";
  registrationStatus: "none" | "registered";
  bssid?: string;
  ssid?: string;
  registeredAt?: string;
  /** 마지막 분석된 계약서 ID (서버 측 LaborContract.id) */
  contractId?: number;
  /** 백엔드 part_time_job.id — BSSID 등록 시 자동 채워짐. 출퇴근 API에서 사용. */
  partTimeJobId?: number;
  createdAt: string;
  /** 사용자가 업로드한 계약서 이미지 local URI. */
  contractImageUri?: string;
  /** 마지막 계약서 분석 결과. */
  contractAnalysis?: ContractAnalysisResult;

  // ── 근무 정보 (4-B Step 1 입력) ──
  /** 근무 요일 — DayOfWeek string 배열. 예: ["MONDAY","TUESDAY"]. */
  workDays?: string[];
  /** "09:00" (LocalTime). */
  workStartTime?: string;
  /** "18:00" (LocalTime). */
  workEndTime?: string;
  /** "2026-06-01" (LocalDate). */
  startDay?: string;
  /** 사용자 지정 시급. 미입력이면 백엔드 최저시급 적용. */
  workHourlyWage?: number;
}

/** 사용자가 1단계 근무 정보 입력 후 저장되는 페이로드. */
export interface WorkInfoInput {
  workDays: string[];
  workStartTime: string;
  workEndTime: string;
  startDay: string;
  hourlyWage?: number;
}

interface FavoriteWorkplaceState {
  workplaces: FavoriteWorkplace[];
  addWorkplace: (name: string) => void;
  removeWorkplace: (id: string) => void;
  /** 업로드+분석 한 번에 완료 처리 (HEAD 호환). */
  markContractUploaded: (
    id: string,
    imageUri: string,
    analysis: ContractAnalysisResult,
  ) => void;
  /** 분석 결과만 갱신 (텍스트 편집 등). */
  updateContractAnalysis: (
    id: string,
    analysis: ContractAnalysisResult,
  ) => void;
  /** contractStatus만 갱신 (백엔드 흐름). */
  updateContractStatus: (
    id: string,
    status: "none" | "uploaded" | "analyzed",
  ) => void;
  /** BSSID 등록 완료 처리. */
  markRegistered: (id: string, bssid: string, ssid: string) => void;
  /** contractId 갱신. */
  setContractId: (id: string, contractId: number) => void;
  /** partTimeJobId 갱신 — BSSID 등록 시 자동 부여. */
  setPartTimeJobId: (id: string, partTimeJobId: number) => void;
  /** 근무 정보 (workDays/시간/시급) 저장. */
  setWorkInfo: (id: string, info: WorkInfoInput) => void;
}

export const useFavoriteWorkplaceStore = create<FavoriteWorkplaceState>()(
  persist(
    (set) => ({
      workplaces: [],
      addWorkplace: (name) =>
        set((state) => ({
          workplaces: [
            ...state.workplaces,
            {
              id: Date.now().toString(),
              name,
              contractStatus: "none",
              registrationStatus: "none",
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removeWorkplace: (id) =>
        set((state) => ({
          workplaces: state.workplaces.filter((w) => w.id !== id),
        })),
      markContractUploaded: (id, imageUri, analysis) =>
        set((state) => ({
          workplaces: state.workplaces.map((w) =>
            w.id === id
              ? {
                  ...w,
                  contractStatus: "uploaded",
                  contractImageUri: imageUri,
                  contractAnalysis: analysis,
                  contractId: analysis.contractId ?? w.contractId,
                }
              : w,
          ),
        })),
      updateContractAnalysis: (id, analysis) =>
        set((state) => ({
          workplaces: state.workplaces.map((w) =>
            w.id === id ? { ...w, contractAnalysis: analysis } : w,
          ),
        })),
      updateContractStatus: (id, status) =>
        set((state) => ({
          workplaces: state.workplaces.map((w) =>
            w.id === id ? { ...w, contractStatus: status } : w,
          ),
        })),
      markRegistered: (id, bssid, ssid) =>
        set((state) => ({
          workplaces: state.workplaces.map((w) =>
            w.id === id
              ? {
                  ...w,
                  registrationStatus: "registered",
                  bssid,
                  ssid,
                  registeredAt: new Date().toISOString(),
                }
              : w,
          ),
        })),
      setContractId: (id, contractId) =>
        set((state) => ({
          workplaces: state.workplaces.map((w) =>
            w.id === id ? { ...w, contractId } : w,
          ),
        })),
      setPartTimeJobId: (id, partTimeJobId) =>
        set((state) => ({
          workplaces: state.workplaces.map((w) =>
            w.id === id ? { ...w, partTimeJobId } : w,
          ),
        })),
      setWorkInfo: (id, info) =>
        set((state) => ({
          workplaces: state.workplaces.map((w) =>
            w.id === id
              ? {
                  ...w,
                  workDays: info.workDays,
                  workStartTime: info.workStartTime,
                  workEndTime: info.workEndTime,
                  startDay: info.startDay,
                  workHourlyWage: info.hourlyWage,
                }
              : w,
          ),
        })),
    }),
    {
      name: "albasave-favorite-workplace",
      storage: persistStorage,
      version: 2,
      migrate: (persisted: unknown, version) => {
        // v1 → v2: bssidStatus → registrationStatus 마이그레이션
        if (
          persisted !== null &&
          typeof persisted === "object" &&
          "workplaces" in persisted
        ) {
          const state = persisted as {
            workplaces: Array<Record<string, unknown>>;
          };
          if (version < 2) {
            state.workplaces = state.workplaces.map((w) => {
              const migrated = { ...w };
              if ("bssidStatus" in migrated && !("registrationStatus" in migrated)) {
                migrated.registrationStatus = migrated.bssidStatus;
                delete migrated.bssidStatus;
              }
              return migrated;
            });
          }
        }
        return persisted as FavoriteWorkplaceState;
      },
    },
  ),
);
