import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/shared/lib/zustand-storage";

export interface FavoriteWorkplace {
  id: string;
  name: string;
  contractStatus: "none" | "uploaded" | "analyzed";
  bssidStatus: "none" | "registered";
  createdAt: string;
}

interface FavoriteWorkplaceState {
  workplaces: FavoriteWorkplace[];
  addWorkplace: (name: string) => void;
  removeWorkplace: (id: string) => void;
  updateContractStatus: (
    id: string,
    status: FavoriteWorkplace["contractStatus"],
  ) => void;
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
              bssidStatus: "none",
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removeWorkplace: (id) =>
        set((state) => ({
          workplaces: state.workplaces.filter((w) => w.id !== id),
        })),
      updateContractStatus: (id, status) =>
        set((state) => ({
          workplaces: state.workplaces.map((w) =>
            w.id === id ? { ...w, contractStatus: status } : w,
          ),
        })),
    }),
    {
      name: "albasave-favorite-workplace",
      storage: persistStorage,
    },
  ),
);
