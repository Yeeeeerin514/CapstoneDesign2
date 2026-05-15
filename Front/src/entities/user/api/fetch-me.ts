import { apiClient } from "@/shared/api/axios-instance";
import type { User } from "../model/types";

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}
