import { apiClient } from "@/shared/api/axios-instance";

/**
 * 관심업장/근무업장 목록 API.
 *
 * 백엔드 PartTimeJob 은 status(FAVORITE/REGISTERED) 로 라이프사이클을 구분한다.
 * - 공고문 분석 시 자동으로 FAVORITE 행이 생성된다(서버가 유저별로 저장).
 * - 알바 등록(BSSID 등록)을 마치면 같은 행이 REGISTERED 로 전이된다.
 *
 * 따라서 관심업장 탭은 GET /working/favorites, 근무업장 탭은 GET /working/workplaces 를 호출한다.
 *
 * 인증: JWT 필요 (apiClient 인터셉터가 Bearer 토큰 자동 첨부).
 */
export type PartTimeJobStatus = "FAVORITE" | "REGISTERED";

/** GET /api/working/favorites · /api/working/workplaces 응답 항목 (PartTimeJobSummary). */
export interface PartTimeJobSummaryResponse {
  partTimeJobId: number;
  status: PartTimeJobStatus;
  businessName: string | null;
  hourlyWage: number | null;
  workDays: string[]; // DayOfWeek 이름 배열
  startTime: string | null; // "HH:mm:ss"
  endTime: string | null;
  startDay: string | null; // "yyyy-MM-dd"
  bssid: string | null;
  isActive: boolean | null;
  jobPostingAnalysisId: number | null;
}

/** 관심업장(FAVORITE) 목록 조회. */
export async function fetchFavoriteWorkplaces(): Promise<
  PartTimeJobSummaryResponse[]
> {
  const { data } = await apiClient.get<PartTimeJobSummaryResponse[]>(
    "/working/favorites",
  );
  return data;
}

/** 근무업장(REGISTERED) 목록 조회. */
export async function fetchRegisteredWorkplaces(): Promise<
  PartTimeJobSummaryResponse[]
> {
  const { data } = await apiClient.get<PartTimeJobSummaryResponse[]>(
    "/working/workplaces",
  );
  return data;
}

/**
 * 관심업장/근무업장 삭제.
 * DELETE /api/working/part-time-jobs/{id}
 */
export async function deleteWorkplace(partTimeJobId: number): Promise<void> {
  await apiClient.delete(`/working/part-time-jobs/${partTimeJobId}`);
}
