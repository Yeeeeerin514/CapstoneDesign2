import { create } from "zustand";
import type { WifiNetwork } from "../lib/wifi-scanner";

interface BssidScanState {
  isScanning: boolean;
  networks: WifiNetwork[];
  selectedBssid: string | null;
  error: string | null;
  setScanning: (v: boolean) => void;
  /** 네트워크 리스트 저장. 신호 강한 것 자동으로 isRecommended=true 부여. */
  setNetworks: (v: WifiNetwork[]) => void;
  selectNetwork: (bssid: string) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

const initialState = {
  isScanning: false,
  networks: [] as WifiNetwork[],
  selectedBssid: null as string | null,
  error: null as string | null,
};

export const useBssidScanStore = create<BssidScanState>((set) => ({
  ...initialState,
  setScanning: (isScanning) => set({ isScanning }),
  setNetworks: (networks) => {
    const sorted = [...networks].sort((a, b) => b.level - a.level);
    const enriched = sorted.map((n, i) => ({ ...n, isRecommended: i === 0 }));
    set({ networks: enriched });
  },
  selectNetwork: (bssid) => set({ selectedBssid: bssid }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
