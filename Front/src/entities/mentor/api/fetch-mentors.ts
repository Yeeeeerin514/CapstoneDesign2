import { apiClient } from "@/shared/api/axios-instance";
import type { MentorProfile, EscrowOrder } from "../model/types";

export async function fetchRecommendedMentors(): Promise<MentorProfile[]> {
  const { data } = await apiClient.get<MentorProfile[]>("/mentors/recommended");
  return data;
}

export async function fetchMentor(id: string): Promise<MentorProfile> {
  const { data } = await apiClient.get<MentorProfile>(`/mentors/${id}`);
  return data;
}

export async function createEscrowOrder(
  mentorId: string,
): Promise<EscrowOrder> {
  const { data } = await apiClient.post<EscrowOrder>("/escrow-orders", {
    mentorId,
  });
  return data;
}
