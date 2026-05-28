/**
 * 사업장(workplace) 도메인 타입.
 * - 등록 단계는 4가지 상태로 표현 (관심업장 목록 카드 배지에 사용).
 */
export type WorkplaceStatus =
  | "contract-pending" // 계약서 미업로드
  | "contract-analyzed" // 계약서 분석 완료
  | "bssid-pending" // BSSID 미등록
  | "registered"; // 등록 완료, 자동 기록 활성

export interface WorkplaceSchedule {
  /** 요일별 출퇴근 시간 (0=일요일, 1=월요일, ..., 6=토요일). 미설정 요일은 null. */
  weeklySchedule: Record<number, { start: string; end: string } | null>;
}

export interface Workplace {
  id: string;
  name: string;
  /** 사업장 주소 — Phase 2에서 지오펜싱 기준으로 사용. */
  address?: string;
  hourlyWage: number;
  status: WorkplaceStatus;
  /** ISO 문자열. */
  createdAt: string;
  /** 등록된 Wi-Fi BSSID (12자리 MAC). 미등록이면 null. */
  bssid: string | null;
  /** 표시용 Wi-Fi 이름 (SSID). 미등록이면 undefined. */
  ssid?: string;
  /** 연결된 계약서 ID. 미업로드면 null. */
  contractId: string | null;
  /** 예정 출퇴근 시간(요일별). */
  schedule?: WorkplaceSchedule;
  /** registered 상태가 된 시각 (ISO). */
  registeredAt?: string;
}
