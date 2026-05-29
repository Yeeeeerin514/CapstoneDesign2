import { apiClient } from "@/shared/api/axios-instance";

/**
 * POST /api/working/register-workplace
 * BSSID 등록 화면 완료 시점에 호출.
 *
 * 인증: JWT 필요 (백엔드 @AuthenticationPrincipal Long userId).
 * apiClient는 axios 인터셉터에서 Bearer 토큰을 자동 첨부하므로 추가 헤더 작업 없음.
 * noAuth axios 인스턴스로 호출하면 백엔드가 userId를 null로 받아 저장이 깨지므로
 * 반드시 apiClient를 사용한다.
 */
export interface RegisterWorkplaceRequest {
  /** PartTimeJob.businessName 으로 저장됨. */
  workplaceName: string;
  /** 필수 — 없으면 백엔드 400. */
  bssid: string;
  /** 선택 — 백엔드 저장 안 함, 전달만. */
  ssid?: string;
}

export interface RegisterWorkplaceResponse {
  partTimeJobId: number;
  bssid: string;
  workplaceName: string;
}

export async function registerWorkplace(
  params: RegisterWorkplaceRequest,
): Promise<RegisterWorkplaceResponse> {
  const { data } = await apiClient.post<RegisterWorkplaceResponse>(
    "/working/register-workplace",
    params,
  );
  return data;
}
