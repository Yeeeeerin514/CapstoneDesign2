import { isAxiosError } from "axios";
import { apiClient } from "@/shared/api/axios-instance";
import type { ApiContractAnalysisResponse } from "../model/types";

/**
 * 명세 캐논 — POST /api/contracts/analyze 응답과 동일 구조.
 * 기존 ApiContractAnalysisResponse의 별칭.
 */
export type ContractAnalysisResponse = ApiContractAnalysisResponse;

/**
 * GET /api/contracts/{contractId}/factsheet 응답.
 * 신고 자동 입력(4-D)에서 businessRegistrationNumber·employerName 등을 prefill 용도로 사용.
 */
export interface ContractFactSheet {
  businessRegistrationNumber: string | null;
  /** "MONDAY"|"TUESDAY"|...|"SUNDAY" */
  workDays: string[];
  /** "09:00" */
  workStartTime: string;
  workEndTime: string;
  /** "2020-03-05" */
  employmentStartDate: string;
  employmentEndDate: string | null;
  hourlyWage: number | null;
  minimumWage: number;
  monthlyWage: number | null;
  wagePaymentDate: string | null;
  wagePaymentMethod: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  employerName: string | null;
  employerAddress: string | null;
  employerPhone: string | null;
  employerRepresentative: string | null;
}

/**
 * 계약서 단건 조회.
 * permitAll이지만 apiClient 경유로 JWT 자동 부착 → 백엔드가 소유자 격리 가능.
 * 다른 사용자의 계약서 → 400 / 미존재 → 404.
 */
export async function fetchContractDetail(
  contractId: number,
): Promise<ContractAnalysisResponse> {
  const { data } = await apiClient.get<ContractAnalysisResponse>(
    `/contracts/${contractId}`,
  );
  return data;
}

/**
 * 특정 알바(관심업장)의 가장 최근 계약서 분석 조회.
 * 로컬 캐시(contractAnalysis)가 유실됐을 때 "분석 결과 다시 보기"의 서버 폴백.
 * 분석 기록이 없으면 null.
 */
export async function fetchLatestContractByPartTimeJob(
  partTimeJobId: number,
): Promise<ContractAnalysisResponse | null> {
  try {
    const { data } = await apiClient.get<ContractAnalysisResponse>(
      "/contracts/latest",
      { params: { partTimeJobId } },
    );
    return data;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

/**
 * 계약서 factsheet 조회 — 신고 자동 입력용 경량 데이터.
 */
export async function fetchContractFactSheet(
  contractId: number,
): Promise<ContractFactSheet> {
  const { data } = await apiClient.get<ContractFactSheet>(
    `/contracts/${contractId}/factsheet`,
  );
  return data;
}
