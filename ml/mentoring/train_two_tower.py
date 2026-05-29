"""
Two-tower 신경망 학습 — 멘토-멘티 매칭 점수 예측.

구조:
    Mentor profile (30+차원) ──→ MLP[64→32→16] ──→ Mentor embedding (16d)
                                                            ↘
                                                            cosine similarity → loss
                                                            ↗
    Mentee profile (30+차원) ──→ MLP[64→32→16] ──→ Mentee embedding (16d)

총 파라미터 ~10K (모델 크기 ~40KB).

학습 후 가중치를 weights.json으로 export → Java에서 forward pass.

사용:
    pip install torch
    python ml/mentoring/train_two_tower.py --epochs 20
    # → ml/mentoring/data/two_tower_weights.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset

# 백엔드 enum과 동일 (generate_synthetic_data.py 참고)
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

INPUT_DIM = (
    len(INDUSTRY)
    + len(DAMAGE_TYPE)
    + len(EMPLOYMENT_TYPE)
    + len(BUSINESS_SIZE)
    + len(REGION)
    + len(DAMAGE_AMOUNT)
)


def encode(profile: dict) -> torch.Tensor:
    """카테고리 → 원-핫 / 다중선택 → multi-hot. 합산 차원 = INPUT_DIM."""
    vec = torch.zeros(INPUT_DIM)
    offset = 0
    # industry
    if profile["industry"] in INDUSTRY:
        vec[offset + INDUSTRY.index(profile["industry"])] = 1.0
    offset += len(INDUSTRY)
    # damage_types (multi-hot)
    for d in profile["damage_types"]:
        if d in DAMAGE_TYPE:
            vec[offset + DAMAGE_TYPE.index(d)] = 1.0
    offset += len(DAMAGE_TYPE)
    # employment_type
    if profile["employment_type"] in EMPLOYMENT_TYPE:
        vec[offset + EMPLOYMENT_TYPE.index(profile["employment_type"])] = 1.0
    offset += len(EMPLOYMENT_TYPE)
    # business_size
    if profile["business_size"] in BUSINESS_SIZE:
        vec[offset + BUSINESS_SIZE.index(profile["business_size"])] = 1.0
    offset += len(BUSINESS_SIZE)
    # region
    if profile["region"] in REGION:
        vec[offset + REGION.index(profile["region"])] = 1.0
    offset += len(REGION)
    # damage_amount
    if profile["damage_amount"] in DAMAGE_AMOUNT:
        vec[offset + DAMAGE_AMOUNT.index(profile["damage_amount"])] = 1.0
    return vec


class PairsDataset(Dataset):
    def __init__(self, path: Path) -> None:
        self.pairs = []
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                self.pairs.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        p = self.pairs[idx]
        return encode(p["mentor"]), encode(p["mentee"]), torch.tensor(p["similarity"], dtype=torch.float32)


class Tower(nn.Module):
    def __init__(self, in_dim: int, hidden: int = 64, out_dim: int = 16) -> None:
        super().__init__()
        self.fc1 = nn.Linear(in_dim, hidden)
        self.fc2 = nn.Linear(hidden, hidden // 2)
        self.fc3 = nn.Linear(hidden // 2, out_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        x = self.fc3(x)
        # L2 normalize → cosine 유사도 = 단순 dot product
        return F.normalize(x, p=2, dim=-1)


class TwoTowerModel(nn.Module):
    def __init__(self, in_dim: int) -> None:
        super().__init__()
        self.mentor_tower = Tower(in_dim)
        self.mentee_tower = Tower(in_dim)

    def forward(self, mentor: torch.Tensor, mentee: torch.Tensor) -> torch.Tensor:
        m_emb = self.mentor_tower(mentor)
        u_emb = self.mentee_tower(mentee)
        # cosine sim (둘 다 L2 normalized) → dot product
        sim = (m_emb * u_emb).sum(dim=-1)
        # [-1, 1] → [0, 1]
        return (sim + 1.0) / 2.0


def train(args: argparse.Namespace) -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}, INPUT_DIM={INPUT_DIM}")

    data_path: Path = args.data
    if not data_path.exists():
        raise SystemExit(f"❌ 데이터 없음: {data_path}\n먼저 generate_synthetic_data.py 실행하세요")

    ds = PairsDataset(data_path)
    n_train = int(len(ds) * 0.9)
    n_val = len(ds) - n_train
    train_ds, val_ds = torch.utils.data.random_split(ds, [n_train, n_val])
    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=128, shuffle=False)

    model = TwoTowerModel(INPUT_DIM).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=args.lr)
    loss_fn = nn.MSELoss()

    n_params = sum(p.numel() for p in model.parameters())
    print(f"Total parameters: {n_params}")

    best_val = float("inf")
    for epoch in range(args.epochs):
        model.train()
        total = 0.0
        for mb, ub, yb in train_loader:
            mb, ub, yb = mb.to(device), ub.to(device), yb.to(device)
            opt.zero_grad()
            pred = model(mb, ub)
            loss = loss_fn(pred, yb)
            loss.backward()
            opt.step()
            total += loss.item() * mb.size(0)
        avg_train = total / n_train

        model.eval()
        with torch.no_grad():
            v_total = 0.0
            for mb, ub, yb in val_loader:
                mb, ub, yb = mb.to(device), ub.to(device), yb.to(device)
                pred = model(mb, ub)
                v_total += loss_fn(pred, yb).item() * mb.size(0)
            avg_val = v_total / n_val
        print(f"Epoch {epoch+1:2d}/{args.epochs}  train_loss={avg_train:.4f}  val_loss={avg_val:.4f}")
        if avg_val < best_val:
            best_val = avg_val

    # 가중치 export — Java에서 forward pass 위해 JSON으로
    out: dict = {
        "input_dim": INPUT_DIM,
        "feature_layout": {
            "industry": {"start": 0, "size": len(INDUSTRY), "values": INDUSTRY},
            "damage_types": {
                "start": len(INDUSTRY),
                "size": len(DAMAGE_TYPE),
                "values": DAMAGE_TYPE,
            },
            "employment_type": {
                "start": len(INDUSTRY) + len(DAMAGE_TYPE),
                "size": len(EMPLOYMENT_TYPE),
                "values": EMPLOYMENT_TYPE,
            },
            "business_size": {
                "start": len(INDUSTRY) + len(DAMAGE_TYPE) + len(EMPLOYMENT_TYPE),
                "size": len(BUSINESS_SIZE),
                "values": BUSINESS_SIZE,
            },
            "region": {
                "start": len(INDUSTRY)
                + len(DAMAGE_TYPE)
                + len(EMPLOYMENT_TYPE)
                + len(BUSINESS_SIZE),
                "size": len(REGION),
                "values": REGION,
            },
            "damage_amount": {
                "start": len(INDUSTRY)
                + len(DAMAGE_TYPE)
                + len(EMPLOYMENT_TYPE)
                + len(BUSINESS_SIZE)
                + len(REGION),
                "size": len(DAMAGE_AMOUNT),
                "values": DAMAGE_AMOUNT,
            },
        },
        "mentor_tower": {
            "fc1": {
                "weight": model.mentor_tower.fc1.weight.detach().cpu().numpy().tolist(),
                "bias": model.mentor_tower.fc1.bias.detach().cpu().numpy().tolist(),
            },
            "fc2": {
                "weight": model.mentor_tower.fc2.weight.detach().cpu().numpy().tolist(),
                "bias": model.mentor_tower.fc2.bias.detach().cpu().numpy().tolist(),
            },
            "fc3": {
                "weight": model.mentor_tower.fc3.weight.detach().cpu().numpy().tolist(),
                "bias": model.mentor_tower.fc3.bias.detach().cpu().numpy().tolist(),
            },
        },
        "mentee_tower": {
            "fc1": {
                "weight": model.mentee_tower.fc1.weight.detach().cpu().numpy().tolist(),
                "bias": model.mentee_tower.fc1.bias.detach().cpu().numpy().tolist(),
            },
            "fc2": {
                "weight": model.mentee_tower.fc2.weight.detach().cpu().numpy().tolist(),
                "bias": model.mentee_tower.fc2.bias.detach().cpu().numpy().tolist(),
            },
            "fc3": {
                "weight": model.mentee_tower.fc3.weight.detach().cpu().numpy().tolist(),
                "bias": model.mentee_tower.fc3.bias.detach().cpu().numpy().tolist(),
            },
        },
        "meta": {
            "n_params": n_params,
            "best_val_loss": best_val,
            "epochs": args.epochs,
        },
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print(f"✅ 가중치 export 완료: {args.out}  (best val_loss={best_val:.4f})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data",
        type=Path,
        default=Path(__file__).parent / "data" / "synthetic_pairs.jsonl",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).parent / "data" / "two_tower_weights.json",
    )
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--lr", type=float, default=1e-3)
    args = parser.parse_args()
    train(args)


if __name__ == "__main__":
    main()
