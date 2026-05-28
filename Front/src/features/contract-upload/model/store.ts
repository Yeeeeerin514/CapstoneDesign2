import { create } from "zustand";

export interface UploadedFile {
  id: string;
  uri: string;
  name: string;
}

interface ContractUploadStoreState {
  files: UploadedFile[];
  isAnalyzing: boolean;
  addFile: (asset: { uri: string; fileName?: string | null }) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  setAnalyzing: (v: boolean) => void;
}

export const useContractUploadStore = create<ContractUploadStoreState>(
  (set) => ({
    files: [],
    isAnalyzing: false,
    addFile: (asset) =>
      set((s) => ({
        files: [
          ...s.files,
          {
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            uri: asset.uri,
            name:
              asset.fileName ?? `근로계약서_${s.files.length + 1}.jpg`,
          },
        ],
      })),
    removeFile: (id) =>
      set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
    clearFiles: () => set({ files: [] }),
    setAnalyzing: (v) => set({ isAnalyzing: v }),
  }),
);
