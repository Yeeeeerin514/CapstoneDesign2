import { create } from "zustand";
import type { ContractAnalysisResult } from "@/entities/job-post";

export interface FavoriteWorkplace {
  id: string;
  name: string;
  contractStatus: "none" | "uploaded";
  registrationStatus: "none" | "registered";
  /** 등록된 Wi-Fi BSSID. registrationStatus=registered일 때만 채워짐. */
  bssid?: string;
  /** 표시용 Wi-Fi 이름. */
  ssid?: string;
  /** registered 상태가 된 시각 (ISO). */
  registeredAt?: string;
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
  markContractUploaded: (
    id: string,
    imageUri: string,
    analysis: ContractAnalysisResult,
  ) => void;
  updateContractAnalysis: (
    id: string,
    analysis: ContractAnalysisResult,
  ) => void;
  markRegistered: (id: string, bssid: string, ssid: string) => void;
}

export const useFavoriteWorkplaceStore = create<FavoriteWorkplaceState>(
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
  }),
);
