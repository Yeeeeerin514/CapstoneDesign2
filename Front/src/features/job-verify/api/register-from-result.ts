import { createWorkplace, type Workplace } from "@/entities/workplace";
import type { JobVerifyResult } from "../model/types";

/** 분석 결과를 관심업장으로 등록. workplaceName / hourlyWage 누락 시 throw. */
export async function registerWorkplaceFromResult(
  result: JobVerifyResult,
): Promise<Workplace> {
  if (result.workplaceName === null || result.workplaceName.length === 0) {
    throw new Error("사업장명이 비어 있어 등록할 수 없어요");
  }
  if (result.hourlyWage === null) {
    throw new Error("시급이 비어 있어 등록할 수 없어요");
  }
  return createWorkplace({
    name: result.workplaceName,
    hourlyWage: result.hourlyWage,
  });
}
