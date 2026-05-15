import { create } from "zustand";
import type { WifiNetwork } from "../lib/wifi-scanner";

interface BssidScanState {
  isScanning: boolean;
  networks: WifiNetwork[];
  selectedBssid: string | null;
  error: string | null;
  setScanning: (v: boolean) => void;
  setNetworks: (v: WifiNetwork[]) => void;
  setSelectedBssid: (v: string | null) => void;
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
  setNetworks: (networks) => set({ networks }),
  setSelectedBssid: (selectedBssid) => set({ selectedBssid }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
