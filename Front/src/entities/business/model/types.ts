/**
 * 사업장 검색 결과 1건 — `GET /api/businesses/search` 응답 `results[]` 와 1:1 매칭.
 * 백엔드 통신 문서(2026-05-30) §2.1.
 */
export interface BusinessSearchResult {
  businessRegistrationNumber: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  representative: string | null;
  /** 관할 노동지청 (예: "서울강남고용노동지청"). */
  laborOffice: string | null;
}

export interface BusinessSearchResponse {
  results: BusinessSearchResult[];
  total: number;
}
