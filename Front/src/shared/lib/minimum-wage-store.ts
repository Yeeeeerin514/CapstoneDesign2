import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./zustand-storage";

/**
 * 최저시급 글로벌 store — 백엔드 GET /api/minimum-wage 응답을 캐싱.
 * - 앱 시작 시 _layout.tsx의 24h 캐시 로드 useEffect가 갱신.
 * - 호출처는 `useMinimumWageStore.getState().minimumWage` 또는 selector로 읽음.
 * - 폴백 값(2030 / 현재 연도)은 백엔드 응답 전·실패 시에만 보이는 임시 값.
 */
const FALLBACK_WAGE = 10_320;

interface MinimumWageState {
  minimumWage: number;
  minimumWageYear: number;
  setMinimumWage: (wage: number, year: number) => void;
}

export const useMinimumWageStore = create<MinimumWageState>()(
  persist(
    (set) => ({
      minimumWage: FALLBACK_WAGE,
      minimumWageYear: new Date().getFullYear(),
      setMinimumWage: (wage, year) =>
        set({ minimumWage: wage, minimumWageYear: year }),
    }),
    {
      name: "albasave-minimum-wage",
      storage: persistStorage,
      version: 1,
      migrate: (persisted: unknown, _version) => {
        // v0 이전 데이터는 없음(신규 store). 손상된 데이터만 폴백으로 복구.
        if (
          persisted === null ||
          typeof persisted !== "object" ||
          !("minimumWage" in persisted) ||
          !("minimumWageYear" in persisted)
        ) {
          return {
            minimumWage: FALLBACK_WAGE,
            minimumWageYear: new Date().getFullYear(),
          } as MinimumWageState;
        }
        return persisted as MinimumWageState;
      },
    },
  ),
);

/** 코멘트/placeholder 등 hook 호출 불가 컨텍스트용 동기 readout. */
export function getMinimumWage(): { wage: number; year: number } {
  const s = useMinimumWageStore.getState();
  return { wage: s.minimumWage, year: s.minimumWageYear };
}
