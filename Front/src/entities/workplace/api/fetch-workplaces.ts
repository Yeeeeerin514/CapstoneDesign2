import { apiClient } from "@/shared/api/axios-instance";
import type { Workplace } from "../model/types";

export async function fetchWorkplaces(): Promise<Workplace[]> {
  const { data } = await apiClient.get<Workplace[]>("/workplaces");
  return data;
}

export async function fetchWorkplace(id: string): Promise<Workplace> {
  const { data } = await apiClient.get<Workplace>(`/workplaces/${id}`);
  return data;
}

export interface CreateWorkplaceInput {
  name: string;
  hourlyWage: number;
  bssid?: string;
  contractId?: string;
}

export async function createWorkplace(
  input: CreateWorkplaceInput,
): Promise<Workplace> {
  const { data } = await apiClient.post<Workplace>("/workplaces", input);
  return data;
}
