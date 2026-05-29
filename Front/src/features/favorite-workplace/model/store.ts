import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/shared/lib/zustand-storage";
import type { ContractAnalysisResult } from "@/entities/job-post";

export interface FavoriteWorkplace {
  id: string;
  name: string;
  contractStatus: "none" | "uploaded" | "analyzed";
  /** 사업장 등록 상태 (BSSID 등록 완료 시 "registered") */
  registrationStatus: "none" | "registered";
  /** 등록된 사업장 Wi-Fi BSSID */
  bssid?: string;
  /** 등록된 사업장 Wi-Fi SSID (사용자 표시용) */
  ssid?: string;
  /** 등록 완료 시각 (ISO) */
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
    status: FavoriteWorkplace["contractStatus"],
  ) => void;
  /** 서버 측 LaborContract.id 저장. */
  setContractId: (id: string, contractId: number) => void;
  /** 백엔드 part_time_job.id 저장. */
  setPartTimeJobId: (id: string, partTimeJobId: number) => void;
  /** BSSID 등록 완료 처리 (사업장 정식 등록). */
  markRegistered: (id: string, bssid: string, ssid: string) => void;
  /** 등록 취소 (사업장에서 제외). */
  unregister: (id: string) => void;
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
      unregister: (id) =>
        set((state) => ({
          workplaces: state.workplaces.map((w) =>
            w.id === id
              ? {
                  ...w,
                  registrationStatus: "none",
                  bssid: undefined,
                  ssid: undefined,
                  registeredAt: undefined,
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
