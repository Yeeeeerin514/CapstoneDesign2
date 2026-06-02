import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ExtractedContract } from "../model/types";

/**
 * 계약서 분석 후 업장 등록 1단계 pre-fill용 임시 캐시.
 * 키: `contract_pending_${businessName}`
 * 값: { contractId, extractedInfo, savedAt }
 *
 * - 분석 완료 시 save → 업장 등록 1단계에서 load → 등록 성공 시 clear.
 * - 30일 만료. _layout.tsx 시작 시 cleanExpired 호출.
 */

const KEY_PREFIX = "contract_pending_";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export interface ContractPendingEntry {
  contractId: number | null;
  extractedInfo: ExtractedContract;
  savedAt: number;
}

function keyOf(businessName: string): string {
  return `${KEY_PREFIX}${businessName}`;
}

/** 계약서 분석 완료 시 저장. */
export async function saveContractPending(
  businessName: string,
  contractId: number | null,
  extractedInfo: ExtractedContract,
): Promise<void> {
  const entry: ContractPendingEntry = {
    contractId,
    extractedInfo,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(keyOf(businessName), JSON.stringify(entry));
}

/** 업장 등록 1단계 진입 시 로드. 없으면 null. */
export async function loadContractPending(
  businessName: string,
): Promise<ContractPendingEntry | null> {
  const raw = await AsyncStorage.getItem(keyOf(businessName));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as ContractPendingEntry;
  } catch {
    return null;
  }
}

/** 사업장 등록 성공 직후 삭제. */
export async function clearContractPending(businessName: string): Promise<void> {
  await AsyncStorage.removeItem(keyOf(businessName));
}

/** 현재 저장된 모든 pending businessName 목록 — 관심업장 목록 뱃지 표시용. */
export async function listPendingBusinessNames(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys
    .filter((k) => k.startsWith(KEY_PREFIX))
    .map((k) => k.slice(KEY_PREFIX.length));
}

/** 앱 시작 시 30일 만료 데이터 정리. */
export async function cleanExpiredContractPending(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const targets = keys.filter((k) => k.startsWith(KEY_PREFIX));
  const now = Date.now();
  for (const k of targets) {
    const raw = await AsyncStorage.getItem(k);
    if (raw === null) continue;
    try {
      const entry = JSON.parse(raw) as ContractPendingEntry;
      if (now - entry.savedAt > EXPIRY_MS) {
        await AsyncStorage.removeItem(k);
      }
    } catch {
      // 파싱 실패한 손상 데이터는 즉시 제거
      await AsyncStorage.removeItem(k);
    }
  }
}
