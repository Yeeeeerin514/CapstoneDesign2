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
