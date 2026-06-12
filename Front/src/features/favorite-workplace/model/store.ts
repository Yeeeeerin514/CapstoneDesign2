import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/shared/lib/zustand-storage";
import type { ContractAnalysisResult } from "@/entities/job-post";
import type { PartTimeJobSummaryResponse } from "@/entities/workplace";

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
  /** 이 관심업장을 만든 공고문 분석 ID — "공고 분석 보기" 재조회에 사용. */
  jobPostingAnalysisId?: number;
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
  /**
   * 백엔드 PartTimeJob 목록(관심업장 FAVORITE + 근무업장 REGISTERED)으로 store를 재구축한다.
   *
   * 서버를 "목록·근무정보·등록상태"의 진실의 원천으로 삼되,
   * 로컬에만 있는 부가 상태(contractAnalysis/contractImageUri/contractId/ssid)는
   * partTimeJobId(없으면 업장명)로 매칭해 보존한다.
   *
   * - 서버에 있는 항목: upsert (서버 값 우선, 로컬 계약서 캐시 보존)
   * - 서버에 없고 partTimeJobId도 없는 로컬 항목(미동기화/진행중): 유지
   * - partTimeJobId가 있는데 서버에 없는 항목(서버에서 삭제됨): 제거
   */
  hydrateFromServer: (items: PartTimeJobSummaryResponse[]) => void;
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
      hydrateFromServer: (rawItems) =>
        set((state) => {
          // 레거시 중복 정리: 같은 업장명에 REGISTERED 행이 있으면 FAVORITE 행은 숨긴다.
          // (partTimeJobId 누락으로 승격 대신 새 행이 생성돼 FAVORITE가 남은 과거 데이터 대응)
          const registeredNames = new Set(
            rawItems
              .filter((it) => it.status === "REGISTERED" && it.businessName)
              .map((it) => it.businessName),
          );
          const items = rawItems.filter(
            (it) =>
              !(
                it.status === "FAVORITE" &&
                it.businessName !== null &&
                registeredNames.has(it.businessName)
              ),
          );

          // 로컬 항목 인덱싱: partTimeJobId 우선, 미스 시 업장명으로 매칭.
          // ptId가 있어도 이름 인덱스에 함께 넣는다 — 등록 과정에서 서버 행이
          // 새로 생성돼 id가 바뀐 경우에도 계약서 캐시 등 로컬 부가상태를 보존.
          const byPtId = new Map<number, FavoriteWorkplace>();
          const byName = new Map<string, FavoriteWorkplace>();
          for (const w of state.workplaces) {
            if (w.partTimeJobId !== undefined) byPtId.set(w.partTimeJobId, w);
            byName.set(w.name, w);
          }
          // "HH:mm:ss" → "HH:mm"
          const trimTime = (t: string | null): string | undefined =>
            t ? t.slice(0, 5) : undefined;

          const merged: FavoriteWorkplace[] = items.map((it) => {
            const local =
              byPtId.get(it.partTimeJobId) ??
              (it.businessName ? byName.get(it.businessName) : undefined);
            return {
              // 식별자: 기존 로컬 id 유지(화면 라우팅 키 안정성), 없으면 서버 id 기반 생성
              id: local?.id ?? `pt-${it.partTimeJobId}`,
              name: it.businessName ?? local?.name ?? `알바 ${it.partTimeJobId}`,
              partTimeJobId: it.partTimeJobId,
              jobPostingAnalysisId:
                it.jobPostingAnalysisId ?? local?.jobPostingAnalysisId,
              registrationStatus:
                it.status === "REGISTERED" ? "registered" : "none",
              bssid: it.bssid ?? local?.bssid,
              ssid: local?.ssid,
              registeredAt: local?.registeredAt,
              createdAt: local?.createdAt ?? new Date().toISOString(),
              // ── 로컬 전용 부가 상태 보존 (서버 PartTimeJob에 없음) ──
              contractStatus: local?.contractStatus ?? "none",
              contractId: local?.contractId,
              contractImageUri: local?.contractImageUri,
              contractAnalysis: local?.contractAnalysis,
              // ── 근무 정보: 서버 값 우선, 비면 로컬 유지 ──
              workDays: it.workDays.length > 0 ? it.workDays : local?.workDays,
              workStartTime: trimTime(it.startTime) ?? local?.workStartTime,
              workEndTime: trimTime(it.endTime) ?? local?.workEndTime,
              startDay: it.startDay ?? local?.startDay,
              workHourlyWage: it.hourlyWage ?? local?.workHourlyWage,
            };
          });

          // 서버에 없지만 아직 서버에 올라가지 않은(partTimeJobId 없는) 로컬 항목은 유지.
          // partTimeJobId가 있는데 서버 응답에 없으면 = 서버에서 삭제됨 → merged에 포함 안 되어 자연 제거.
          const mergedIds = new Set(merged.map((m) => m.id));
          const localOnly = state.workplaces.filter(
            (w) => w.partTimeJobId === undefined && !mergedIds.has(w.id),
          );
          return { workplaces: [...merged, ...localOnly] };
        }),
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
