/**
 * className 조합 헬퍼.
 * - 조건부 className을 안전하게 결합 (`clsx` 미니 버전).
 * - `false | null | undefined`는 자동 제외.
 */
export function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter((v): v is string => typeof v === "string" && v.length > 0).join(" ");
}

/** 숫자를 한국 원화 표기로 변환 (예: 10030 -> "10,030원"). */
export function formatCurrency(amount: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(amount))}원`;
}

/** 값을 [min, max] 범위로 클램프. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** 간단한 UUID v4 대체. 서버 ID 받기 전 임시 키 용도. */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 분(min)을 한국어 "X시간 Y분" 형태로 변환.
 * - h===0 → "Y분"
 * - m===0 → "X시간"
 * - 둘 다 있을 때 → "X시간 Y분"
 */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/** 피해 금액을 구간 표시로 변환 (후기 카드 표시용). */
export function getAmountRange(amount: number): string {
  if (amount < 500_000) return "50만원 미만";
  if (amount < 1_000_000) return "50만원대";
  if (amount < 2_000_000) return "100만원대";
  if (amount < 5_000_000) return "200만원대";
  return "500만원 이상";
}

/**
 * 사건 해결 소요일 계산.
 * createdAt~resolvedAt 사이 일수. resolvedAt이 없으면 0.
 */
export function calcResolveDays(input: {
  createdAt?: string;
  startedAt?: string;
  resolvedAt?: string;
}): number {
  if (input.resolvedAt === undefined) return 0;
  const startIso = input.createdAt ?? input.startedAt;
  if (startIso === undefined) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(input.resolvedAt).getTime();
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}
