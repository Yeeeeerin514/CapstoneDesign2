import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApplicantInfo } from "@/entities/report";

/**
 * 진정인(본인) 정보 로컬 저장소.
 * 정책: 진정인 개인정보는 백엔드에 절대 전송하지 않으며 디바이스 로컬에만 보관.
 * PDF 생성 시점에만 읽혀서 진정서에 채워진 뒤 자동으로 보안 삭제되지는 않음
 * (사용자가 마이페이지에서 수동 삭제 가능).
 */
const KEY = "@alba-jikimi/applicant-info-v1";

export async function loadApplicantInfo(): Promise<ApplicantInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as ApplicantInfo;
  } catch {
    return null;
  }
}

export async function saveApplicantInfo(info: ApplicantInfo): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(info));
}

export async function clearApplicantInfo(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function emptyApplicantInfo(): ApplicantInfo {
  return {
    fullName: "",
    rrn: "",
    address: "",
    phone: "",
    email: "",
    mobile: "",
    wantsResultNotice: true,
    wantsLaborOfficeNotice: false,
  };
}
