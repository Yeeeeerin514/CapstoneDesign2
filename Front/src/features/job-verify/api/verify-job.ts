import type { JobVerifyResult } from "../model/types";

/** TODO: 실제 백엔드 연동 시 Claude 호출 코드로 교체. 지금은 3초 지연 mock. */
export async function verifyJobByImage(
  _imageBase64: string,
): Promise<JobVerifyResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 3000));
  return {
    workplaceName: "OO커피",
    hourlyWage: 9860,
    hasHolidayAllowance: false,
    hasFourMajorInsurances: null,
    operationalStatus: "정상 운영",
    wageArrearsHistory: "없음",
    analysisSummary: "최저임금을 준수하고 있으나 주휴수당 언급이 없습니다.",
    issues: [],
  };
}
