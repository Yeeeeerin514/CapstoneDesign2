import { apiClient } from "@/shared/api/axios-instance";
import {
  mapJobPostingApiResponse,
  mapContractApiResponse,
  type ApiJobPostingAnalysisResponse,
  type ApiContractAnalysisResponse,
  type JobPostAnalysisResult,
  type ContractAnalysisResult,
} from "../model/types";

/**
 * 공고문 이미지 분석.
 * POST /api/job-postings/analyze  (multipart/form-data, field=image)
 */
export async function analyzeJobPost(
  imageUri: string,
): Promise<JobPostAnalysisResult> {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "job_post.jpg",
  } as unknown as Blob);

  const { data } = await apiClient.post<ApiJobPostingAnalysisResponse>(
    "/job-postings/analyze",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    },
  );
  return mapJobPostingApiResponse(data);
}

/**
 * 근로계약서 이미지 분석.
 * POST /api/contracts/analyze  (multipart/form-data, field=image)
 *
 * @param fallbackWorkplaceName 추출 실패 시 표시할 업장명 (관심업장 이름 권장)
 */
export async function analyzeContract(
  imageUri: string,
  fallbackWorkplaceName: string,
): Promise<ContractAnalysisResult> {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "contract.jpg",
  } as unknown as Blob);

  const { data } = await apiClient.post<ApiContractAnalysisResponse>(
    "/contracts/analyze",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    },
  );
  return mapContractApiResponse(data, fallbackWorkplaceName);
}
