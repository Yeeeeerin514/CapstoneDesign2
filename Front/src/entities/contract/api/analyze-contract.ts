import { Platform } from "react-native";
import { apiClient } from "@/shared/api/axios-instance";
import type { ContractAnalysis } from "../model/types";

interface ApiExtractedContractInfo {
  hourlyWage: number | null;
  workingHoursPerDay: number | null;
  workingDaysPerWeek: number | null;
  startDate: string | null;
  weeklyHolidayAllowanceMentioned: boolean | null;
  overtimeAllowanceMentioned: boolean | null;
  annualLeaveMentioned: boolean | null;
  employerName: string | null;
  businessRegistrationNumber: string | null;
}

interface ApiContractViolation {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  legalBasis: string;
}

interface ApiContractAnalysisResponse {
  contractId: number;
  hasViolation: boolean;
  extractedInfo: ApiExtractedContractInfo | null;
  violations: ApiContractViolation[];
  summary: string | null;
  minimumWage: number;
  imageUrl: string | null;
  createdAt: string;
}

const VIOLATION_TITLE: Record<string, string> = {
  MINIMUM_WAGE: "최저임금 미달",
  OVERTIME_PAY: "연장수당 규정 누락",
  WEEKLY_HOLIDAY: "주휴수당 명시 누락",
  MANDATORY_ITEMS: "필수 기재사항 누락",
  WORKING_HOURS: "근로시간 불명확",
  ANNUAL_LEAVE: "연차휴가 명시 누락",
};

const SEVERITY_MAP: Record<"HIGH" | "MEDIUM" | "LOW", "danger" | "caution" | "info"> = {
  HIGH: "danger",
  MEDIUM: "caution",
  LOW: "info",
};

/**
 * 근로계약서 이미지를 업로드해 백엔드에서 분석한다.
 * POST /api/contracts/analyze
 */
export async function analyzeContract(
  imageUri: string,
): Promise<ContractAnalysis> {
  const formData = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append("image", blob, "contract.jpg");
  } else {
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "contract.jpg",
    } as unknown as Blob);
  }

  const { data } = await apiClient.post<ApiContractAnalysisResponse>(
    "/contracts/analyze",
    formData,
    {
      headers:
        Platform.OS === "web"
          ? undefined
          : { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    },
  );

  const info = data.extractedInfo;
  return {
    contractId: String(data.contractId),
    workplaceName: info?.employerName ?? "확인불가",
    contractPeriod: info?.startDate ?? "확인불가",
    hourlyWage: info?.hourlyWage ?? 0,
    minimumWage: data.minimumWage,
    issues: (data.violations ?? []).map((v, idx) => ({
      id: `${v.type}-${idx}`,
      severity: SEVERITY_MAP[v.severity],
      title: VIOLATION_TITLE[v.type] ?? v.type,
      description: v.description,
      legalBasis: v.legalBasis,
      recommendation: "",
    })),
  };
}
