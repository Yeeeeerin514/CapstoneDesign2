import { create } from "zustand";
import type { ReportEvidence } from "@/entities/report";

interface ReportSubmitState {
  workplaceId: string | null;
  evidences: ReportEvidence[];
  isSolidarity: boolean;
  isSubmitting: boolean;
  draftPdfUrl: string | null;
  error: string | null;
  setWorkplaceId: (v: string | null) => void;
  addEvidence: (e: ReportEvidence) => void;
  removeEvidence: (id: string) => void;
  toggleSolidarity: () => void;
  setSubmitting: (v: boolean) => void;
  setDraftPdfUrl: (v: string | null) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

const initialState = {
  workplaceId: null as string | null,
  evidences: [] as ReportEvidence[],
  isSolidarity: false,
  isSubmitting: false,
  draftPdfUrl: null as string | null,
  error: null as string | null,
};

export const useReportSubmitStore = create<ReportSubmitState>((set) => ({
  ...initialState,
  setWorkplaceId: (workplaceId) => set({ workplaceId }),
  addEvidence: (e) => set((s) => ({ evidences: [...s.evidences, e] })),
  removeEvidence: (id) =>
    set((s) => ({ evidences: s.evidences.filter((ev) => ev.id !== id) })),
  toggleSolidarity: () => set((s) => ({ isSolidarity: !s.isSolidarity })),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setDraftPdfUrl: (draftPdfUrl) => set({ draftPdfUrl }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
