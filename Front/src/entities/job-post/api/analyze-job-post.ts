import { Platform } from "react-native";
import { apiClient } from "@/shared/api/axios-instance";
import {
  mapJobPostingApiResponse,
  mapContractApiResponse,
  type ApiJobPostingAnalysisResponse,
  type ApiContractAnalysisResponse,
  type JobPostAnalysisResult,
  type ContractAnalysisResult,
} from "../model/types";
import { MOCK_CONTRACT_ANALYSIS, MOCK_JOB_ANALYSIS } from "../model/mock-data";

const USE_MOCK = false; // 실제 백엔드(/job-postings/analyze, /contracts/analyze) 연결

async function buildImageFormData(
  imageUri: string,
  filename: string,
): Promise<FormData> {
  const formData = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append("image", blob, filename);
  } else {
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: filename,
    } as unknown as Blob);
  }
  return formData;
}

/**
 * 공고문 이미지 분석.
 * POST /api/job-postings/analyze  (multipart/form-data, field=image)
 */
export async function analyzeJobPost(
  imageUri: string,
): Promise<JobPostAnalysisResult> {
  if (USE_MOCK) {
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    return { ...MOCK_JOB_ANALYSIS };
  }

  const formData = await buildImageFormData(imageUri, "job_post.jpg");

  const { data } = await apiClient.post<ApiJobPostingAnalysisResponse>(
    "/job-postings/analyze",
    formData,
    {
      // 웹: 헤더 미지정 → axios가 multipart/form-data; boundary=... 자동 생성
      // 네이티브: 명시 필요
      headers:
        Platform.OS === "web"
          ? {}
          : { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    },
  );
  return mapJobPostingApiResponse(data);
}

/**
 * 공고문 분석 단건 재조회.
 * GET /api/job-postings/analyses/{analysisId}
 * 관심업장 카드의 "공고 분석 보기" — 등록 당시 분석 결과를 다시 보여준다.
 */
export async function fetchJobPostingAnalysis(
  analysisId: number,
): Promise<JobPostAnalysisResult> {
  const { data } = await apiClient.get<ApiJobPostingAnalysisResponse>(
    `/job-postings/analyses/${analysisId}`,
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
  if (USE_MOCK) {
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    return { ...MOCK_CONTRACT_ANALYSIS, workplaceName: fallbackWorkplaceName };
  }

  const formData = await buildImageFormData(imageUri, "contract.jpg");

  const { data } = await apiClient.post<ApiContractAnalysisResponse>(
    "/contracts/analyze",
    formData,
    {
      headers:
        Platform.OS === "web"
          ? {}
          : { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    },
  );
  const result = mapContractApiResponse(data);
  if (result.workplaceName.length === 0) {
    result.workplaceName = fallbackWorkplaceName;
  }
  return result;
}
