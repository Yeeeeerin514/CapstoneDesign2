"""
멘토-멘티 매칭용 합성 학습 데이터 생성기.

데이터 0건 환경에서 Two-tower 모델을 콜드스타트 학습시키기 위한 합성 데이터를 만든다.
도메인 룰(Gower distance 기반)로 라벨링 → contrastive learning 페어 생성.

출력: ml/mentoring/data/synthetic_pairs.jsonl
  - 각 라인이 (mentor_features, mentee_features, similarity) JSON
  - similarity ∈ [0, 1], 1=완전 매칭, 0=완전 불일치

사용:
    pip install numpy
    python ml/mentoring/generate_synthetic_data.py --n 3000
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import List

import numpy as np

# 백엔드 enum과 1:1 매핑
INDUSTRY = [
    "FOOD_SERVICE", "DELIVERY", "CONVENIENCE_RETAIL", "MANUFACTURING",
    "OFFICE", "CONSTRUCTION", "SERVICE", "EDUCATION", "HEALTHCARE", "OTHER",
]
DAMAGE_TYPE = [
    "WAGE_ARREARS", "SEVERANCE_PAY", "WEEKLY_HOLIDAY", "OVERTIME_PAY",
    "INSURANCE", "UNFAIR_DISMISSAL", "INDUSTRIAL_ACCIDENT", "UNPAID_BONUS",
    "CONTRACT_BREACH", "OTHER",
]
EMPLOYMENT_TYPE = [
    "SHORT_TERM_PART_TIME", "LONG_TERM_PART_TIME", "DAILY_WORKER",
    "CONTRACT", "FREELANCE", "REGULAR", "OTHER",
]
BUSINESS_SIZE = ["UNDER_5", "SIZE_5_TO_30", "OVER_30", "UNKNOWN"]
REGION = [
    "SEOUL", "BUSAN", "DAEGU", "INCHEON", "GWANGJU", "DAEJEON", "ULSAN",
    "SEJONG", "GYEONGGI", "GANGWON", "CHUNGBUK", "CHUNGNAM", "JEONBUK",
    "JEONNAM", "GYEONGBUK", "GYEONGNAM", "JEJU", "OTHER",
]
DAMAGE_AMOUNT = ["UNDER_100K", "KRW_100K_500K", "KRW_500K_1M", "KRW_1M_5M", "OVER_5M"]


def random_profile(rng: random.Random) -> dict:
    """단일 인물(멘토/멘티 동일 스키마) 프로필 생성."""
    n_damages = rng.randint(1, 3)
    return {
        "industry": rng.choice(INDUSTRY),
        "damage_types": rng.sample(DAMAGE_TYPE, k=n_damages),
        "employment_type": rng.choice(EMPLOYMENT_TYPE),
        "business_size": rng.choice(BUSINESS_SIZE),
        "region": rng.choice(REGION),
        "damage_amount": rng.choice(DAMAGE_AMOUNT),
    }


def jaccard(a: List[str], b: List[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 1.0
    return len(sa & sb) / max(len(sa | sb), 1)


def gower_similarity(mentor: dict, mentee: dict) -> float:
    """도메인 지식 기반 라벨러 — Java GowerDistanceService와 같은 로직."""
    # 가중치
    w = {
        "damage_types": 1.5,
        "industry": 1.0,
        "business_size": 2.0,
        "employment_type": 0.8,
        "damage_amount": 0.6,
        "region": 0.7,
    }
    total_w = sum(w.values())

    # 거리 계산
    d_damage = 1.0 - jaccard(mentor["damage_types"], mentee["damage_types"])
    d_industry = 0.0 if mentor["industry"] == mentee["industry"] else 1.0
    # business size: 5인 미만 vs 그 외 = 1.0
    bs_a, bs_b = mentor["business_size"], mentee["business_size"]
    if bs_a == bs_b:
        d_bs = 0.0
    elif (bs_a == "UNDER_5") != (bs_b == "UNDER_5"):
        d_bs = 1.0
    else:
        d_bs = 0.5
    d_employment = 0.0 if mentor["employment_type"] == mentee["employment_type"] else 1.0
    idx_a = DAMAGE_AMOUNT.index(mentor["damage_amount"])
    idx_b = DAMAGE_AMOUNT.index(mentee["damage_amount"])
    d_amount = abs(idx_a - idx_b) / 4.0
    d_region = 0.0 if mentor["region"] == mentee["region"] else 1.0

    weighted = (
        w["damage_types"] * d_damage
        + w["industry"] * d_industry
        + w["business_size"] * d_bs
        + w["employment_type"] * d_employment
        + w["damage_amount"] * d_amount
        + w["region"] * d_region
    )
    distance = weighted / total_w
    return max(0.0, min(1.0, 1.0 - distance))


def generate(n: int, out_path: Path, seed: int = 42) -> None:
    rng = random.Random(seed)
    np.random.seed(seed)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    pairs_written = 0
    with out_path.open("w", encoding="utf-8") as f:
        for _ in range(n):
            mentor = random_profile(rng)
            # 50%: 매우 가까운 페어 (positive pair에 약간의 노이즈)
            # 30%: 부분 매칭 (일부 특성만 일치)
            # 20%: 완전 무관 (negative pair)
            roll = rng.random()
            if roll < 0.5:
                mentee = dict(mentor)
                # 일부 항목 살짝 변형
                if rng.random() < 0.3:
                    mentee["region"] = rng.choice(REGION)
                if rng.random() < 0.3:
                    mentee["damage_types"] = rng.sample(
                        DAMAGE_TYPE, k=rng.randint(1, 3),
                    )
            elif roll < 0.8:
                # 일부 공유
                mentee = random_profile(rng)
                if rng.random() < 0.5:
                    mentee["industry"] = mentor["industry"]
                if rng.random() < 0.5:
                    mentee["business_size"] = mentor["business_size"]
            else:
                mentee = random_profile(rng)

            sim = gower_similarity(mentor, mentee)
            # 라벨에 ±0.05 노이즈 (현실성)
            sim_label = max(0.0, min(1.0, sim + rng.gauss(0, 0.05)))

            f.write(
                json.dumps(
                    {"mentor": mentor, "mentee": mentee, "similarity": sim_label},
                    ensure_ascii=False,
                )
                + "\n",
            )
            pairs_written += 1

    print(f"✅ {pairs_written}건 페어 저장: {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=3000, help="생성할 페어 수")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).parent / "data" / "synthetic_pairs.jsonl",
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    generate(args.n, args.out, args.seed)


if __name__ == "__main__":
    main()
