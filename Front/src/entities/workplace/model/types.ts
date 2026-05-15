/**
 * 사업장(workplace) 도메인 타입.
 * - 등록 단계는 4가지 상태로 표현 (관심업장 목록 카드 배지에 사용).
 */
export type WorkplaceStatus =
  | "contract-pending"   // 계약서 미업로드
  | "contract-analyzed"  // 계약서 분석 완료
  | "bssid-pending"      // BSSID 미등록
  | "registered";        // 등록 완료

export interface Workplace {
  id: string;
  name: string;
  hourlyWage: number;
  status: WorkplaceStatus;
  /** ISO 문자열. */
  createdAt: string;
  /** 등록된 Wi-Fi BSSID (12자리 MAC). 미등록이면 null. */
  bssid: string | null;
  /** 연결된 계약서 ID. 미업로드면 null. */
  contractId: string | null;
}
