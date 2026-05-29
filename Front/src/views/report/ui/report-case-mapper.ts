/**
 * ReportCase의 한글 라벨 → 매칭 시스템 enum 역매핑.
 * SmartMentorRecommendView에 사건 컨텍스트를 전달할 때 사용.
 */
import type {
  BusinessSize,
  DamageType,
  Industry,
  Region,
} from "@/entities/mentor";

const INDUSTRY_MAP: Record<string, Industry> = {
  "카페": "FOOD_SERVICE",
  "음식점": "FOOD_SERVICE",
  "카페·음식점": "FOOD_SERVICE",
  "요식": "FOOD_SERVICE",
  "요식업": "FOOD_SERVICE",
  "배달": "DELIVERY",
  "배달·물류": "DELIVERY",
  "물류": "DELIVERY",
  "편의점": "CONVENIENCE_RETAIL",
  "편의점·판매": "CONVENIENCE_RETAIL",
  "판매": "CONVENIENCE_RETAIL",
  "제조": "MANUFACTURING",
  "사무": "OFFICE",
  "사무·관리": "OFFICE",
  "건설": "CONSTRUCTION",
  "서비스": "SERVICE",
  "교육": "EDUCATION",
  "강사": "EDUCATION",
  "교육·강사": "EDUCATION",
  "의료": "HEALTHCARE",
  "돌봄": "HEALTHCARE",
  "의료·돌봄": "HEALTHCARE",
};

export function mapIndustryLabelToCode(label: string): Industry {
  if (label === null || label === undefined || label === "") return "OTHER";
  // 정확 일치
  if (INDUSTRY_MAP[label] !== undefined) return INDUSTRY_MAP[label];
  // 부분 매칭
  for (const [key, code] of Object.entries(INDUSTRY_MAP)) {
    if (label.includes(key)) return code;
  }
  return "OTHER";
}

const DAMAGE_MAP: Record<string, DamageType> = {
  "임금체불": "WAGE_ARREARS",
  "임금 체불": "WAGE_ARREARS",
  "퇴직금": "SEVERANCE_PAY",
  "퇴직금 미지급": "SEVERANCE_PAY",
  "주휴수당": "WEEKLY_HOLIDAY",
  "주휴수당 미지급": "WEEKLY_HOLIDAY",
  "연장수당": "OVERTIME_PAY",
  "야간수당": "OVERTIME_PAY",
  "연장·야간수당": "OVERTIME_PAY",
  "연장근로수당": "OVERTIME_PAY",
  "4대보험": "INSURANCE",
  "4대보험 미가입": "INSURANCE",
  "부당해고": "UNFAIR_DISMISSAL",
  "해고": "UNFAIR_DISMISSAL",
  "산재": "INDUSTRIAL_ACCIDENT",
  "산업재해": "INDUSTRIAL_ACCIDENT",
  "상여금": "UNPAID_BONUS",
  "상여금 미지급": "UNPAID_BONUS",
  "계약 위반": "CONTRACT_BREACH",
  "계약위반": "CONTRACT_BREACH",
};

export function mapDamageTypeLabelsToCode(labels: string[]): DamageType[] {
  if (labels === null || labels === undefined || labels.length === 0) return [];
  const result = new Set<DamageType>();
  for (const label of labels) {
    if (DAMAGE_MAP[label] !== undefined) {
      result.add(DAMAGE_MAP[label]);
      continue;
    }
    let matched = false;
    for (const [key, code] of Object.entries(DAMAGE_MAP)) {
      if (label.includes(key)) {
        result.add(code);
        matched = true;
        break;
      }
    }
    if (!matched) result.add("OTHER");
  }
  return Array.from(result);
}

const REGION_PREFIX: { prefix: string; code: Region }[] = [
  { prefix: "서울", code: "SEOUL" },
  { prefix: "부산", code: "BUSAN" },
  { prefix: "대구", code: "DAEGU" },
  { prefix: "인천", code: "INCHEON" },
  { prefix: "광주", code: "GWANGJU" },
  { prefix: "대전", code: "DAEJEON" },
  { prefix: "울산", code: "ULSAN" },
  { prefix: "세종", code: "SEJONG" },
  { prefix: "경기", code: "GYEONGGI" },
  { prefix: "강원", code: "GANGWON" },
  { prefix: "충북", code: "CHUNGBUK" },
  { prefix: "충남", code: "CHUNGNAM" },
  { prefix: "전북", code: "JEONBUK" },
  { prefix: "전남", code: "JEONNAM" },
  { prefix: "경북", code: "GYEONGBUK" },
  { prefix: "경남", code: "GYEONGNAM" },
  { prefix: "제주", code: "JEJU" },
];

export function mapRegionLabelToCode(label: string): Region {
  if (label === null || label === undefined || label === "") return "OTHER";
  for (const { prefix, code } of REGION_PREFIX) {
    if (label.startsWith(prefix)) return code;
  }
  return "OTHER";
}

/** 미지급 금액(원) → DamageAmountRange enum. */
export function amountToRange(
  amount: number,
): "UNDER_100K" | "KRW_100K_500K" | "KRW_500K_1M" | "KRW_1M_5M" | "OVER_5M" {
  if (amount < 100_000) return "UNDER_100K";
  if (amount < 500_000) return "KRW_100K_500K";
  if (amount < 1_000_000) return "KRW_500K_1M";
  if (amount < 5_000_000) return "KRW_1M_5M";
  return "OVER_5M";
}

/** 업종이 5인 미만 사업장 신호인지 (편의점·카페 등은 보통 작음). 단순 휴리스틱. */
export function inferBusinessSize(industry: Industry): BusinessSize {
  switch (industry) {
    case "FOOD_SERVICE":
    case "CONVENIENCE_RETAIL":
    case "DELIVERY":
      return "UNDER_5";
    case "MANUFACTURING":
    case "CONSTRUCTION":
      return "OVER_30";
    default:
      return "UNKNOWN";
  }
}
