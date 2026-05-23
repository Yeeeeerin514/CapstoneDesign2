import { apiClient } from "@/shared/api/axios-instance";
import {
  mapApiResponseToAnalysisResult,
  mapApiResponseToContractResult,
  type ApiContractAnalysisResponse,
  type ApiJobPostAnalysisResponse,
  type ContractAnalysisResult,
  type JobPostAnalysisResult,
} from "../model/types";
import { MOCK_CONTRACT_ANALYSIS, MOCK_JOB_ANALYSIS } from "../model/mock-data";

const USE_MOCK = true; // 백엔드 연결 시 false로 바꾸면 끝

/**
 * 공고 이미지를 분석해 위험 요소를 반환합니다.
 *
 * [목업 → 백엔드 전환 방법]
 * 1. USE_MOCK을 false로 변경
 * 2. EXPO_PUBLIC_API_URL 환경변수에 서버 주소 입력
 * 3. 서버 응답 키 이름이 다르면 mapApiResponseToAnalysisResult 함수 수정
 */
export async function analyzeJobPost(
  imageUri: string,
): Promise<JobPostAnalysisResult> {
  if (USE_MOCK) {
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    return { ...MOCK_JOB_ANALYSIS };
  }

  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "job_post.jpg",
  } as unknown as Blob);

  const { data } = await apiClient.post<ApiJobPostAnalysisResponse>(
    "/analyze/job-post",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return mapApiResponseToAnalysisResult(data);
}

/**
 * 계약서 이미지를 OCR 분석합니다.
 *
 * [목업 → 백엔드 전환 방법]
 * 1. USE_MOCK을 false로 변경
 * 2. 백엔드가 ApiContractAnalysisResponse 스키마(snake_case)로 응답
 * 3. mapApiResponseToContractResult 매퍼가 camelCase로 변환
 */
export async function analyzeContract(
  imageUri: string,
): Promise<ContractAnalysisResult> {
  if (USE_MOCK) {
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    return MOCK_CONTRACT_ANALYSIS;
  }

  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    name: "contract.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const { data } = await apiClient.post<ApiContractAnalysisResponse>(
    "/analyze/contract",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return mapApiResponseToContractResult(data);
}
