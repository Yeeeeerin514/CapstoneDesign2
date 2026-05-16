import type { JobPostAnalysisResult, ApiJobPostAnalysisResponse } from "../model/types";
import { mapApiResponseToAnalysisResult } from "../model/types";
import { MOCK_JOB_ANALYSIS } from "../model/mock-data";

const USE_MOCK = true; // 백엔드 연결 시 false로 바꾸면 끝

/**
 * 공고 이미지를 분석해 위험 요소를 반환합니다.
 *
 * [목업 → 백엔드 전환 방법]
 * 1. USE_MOCK을 false로 변경
 * 2. EXPO_PUBLIC_API_URL 환경변수에 서버 주소 입력
 * 3. 서버 응답 키 이름이 다르면 mapApiResponseToAnalysisResult 함수 수정
 */
export async function analyzeJobPost(imageUri: string): Promise<JobPostAnalysisResult> {
  if (USE_MOCK) {
    await new Promise<void>((r) => setTimeout(() => r(), 2000));
    return { ...MOCK_JOB_ANALYSIS };
  }

  // ── 실제 백엔드 연결 코드 (USE_MOCK = false 시 동작) ──
  const { apiClient } = await import("@/shared/api/axios-instance");
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "job_post.jpg",
  } as any);

  const { data } = await apiClient.post<ApiJobPostAnalysisResponse>(
    "/analyze/job-post",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return mapApiResponseToAnalysisResult(data);
}

/**
 * 계약서 이미지를 분석합니다.
 * USE_MOCK을 false로 바꾸면 실제 API 호출
 */
export async function analyzeContract(imageUri: string): Promise<any> {
  if (USE_MOCK) {
    const { MOCK_CONTRACT_ANALYSIS } = await import("../model/mock-data");
    await new Promise<void>((r) => setTimeout(() => r(), 2000));
    return { ...MOCK_CONTRACT_ANALYSIS };
  }

  const { apiClient } = await import("@/shared/api/axios-instance");
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "contract.jpg",
  } as any);

  const { data } = await apiClient.post("/analyze/contract", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
