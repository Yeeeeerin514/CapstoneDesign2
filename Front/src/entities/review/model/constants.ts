import type { DamageTypeLabel } from "./types";

/**
 * 후기 작성/필터 공용 옵션.
 * ReviewWriteView(작성)와 ReviewListView(필터)가 동일한 집합을 사용하도록 한곳에서 관리한다.
 */

/** 업종 옵션 — 후기 작성 시 선택지. 필터에서는 앞에 "전체"를 붙여 사용. */
export const INDUSTRY_OPTIONS = [
  "카페·음식점",
  "편의점",
  "배달",
  "학원",
  "PC방",
  "기타",
] as const;

/** 지역 옵션 — 후기 작성 시 선택지. 필터에서는 앞에 "전체"를 붙여 사용. */
export const REGION_OPTIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "울산",
  "광주",
  "대전",
  "세종",
  "경남",
  "경북",
  "전북",
  "전남",
  "충남",
  "충북",
  "제주",
  "기타",
] as const;

/** 피해 유형 옵션 — 후기 작성 시 중복 선택 가능. 필터에서는 단일 선택으로 "포함" 매칭. */
export const DAMAGE_OPTIONS: DamageTypeLabel[] = [
  "임금(기본급) 미지급",
  "주휴수당 미지급",
  "연장근로수당 미지급",
  "야간근로수당 미지급",
  "퇴직금 미지급",
];
