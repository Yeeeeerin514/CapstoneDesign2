import { apiClient } from "@/shared/api/axios-instance";
import type { Workplace } from "../model/types";

interface PartTimeJobResponse {
  id: number;
  businessName: string | null;
  hourlyWage: number | null;
  day: string;
  startTime: string;
  endTime: string;
  startDay: string;
  endDay: string | null;
  isActive: boolean;
  bssid: string | null;
  contract: string | null;
}

function toWorkplace(r: PartTimeJobResponse): Workplace {
  const hasBssid = !!r.bssid;
  const hasContract = !!r.contract;
  let status: Workplace["status"] = "contract-pending";
  if (hasContract && hasBssid) status = "registered";
  else if (hasContract) status = "bssid-pending";

  return {
    id: String(r.id),
    name: r.businessName ?? `알바 ${r.id}`,
    hourlyWage: r.hourlyWage ?? 10030,
    status,
    createdAt: r.startDay ?? new Date().toISOString(),
    bssid: r.bssid,
    contractId: r.contract,
  };
}

export async function fetchWorkplaces(): Promise<Workplace[]> {
  const { data } = await apiClient.get<PartTimeJobResponse[]>("/part-time-jobs");
  return data.map(toWorkplace);
}

export async function fetchWorkplace(id: string): Promise<Workplace> {
  const { data } = await apiClient.get<PartTimeJobResponse[]>("/part-time-jobs");
  const found = data.find((r) => String(r.id) === id);
  if (!found) throw new Error("알바를 찾을 수 없습니다.");
  return toWorkplace(found);
}

export interface CreateWorkplaceInput {
  name: string;
  hourlyWage: number;
  bssid?: string;
  contractId?: string;
}

export async function createWorkplace(input: CreateWorkplaceInput): Promise<Workplace> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await apiClient.post<PartTimeJobResponse>("/part-time-jobs", {
    businessName: input.name,
    hourlyWage: input.hourlyWage,
    day: "MON,TUE,WED,THU,FRI",
    startTime: "09:00:00",
    endTime: "18:00:00",
    startDay: today,
  });
  return toWorkplace(data);
}
