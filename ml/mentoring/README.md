# 멘토-멘티 매칭용 Two-tower 신경망

캡스톤용 자체 매칭 AI. Gower distance 기반 합성 데이터로 contrastive learning하여, 데이터 0건 환경에서도 콜드스타트로 학습 가능.

## 모델 구조

```
멘토 프로필 (62차원 multi-hot)
  ↓
  MLP [62 → 64 → 32 → 16] + ReLU
  ↓
  L2 normalize → 멘토 임베딩 (16d)
                                    ↘
                                    cosine sim → [0, 1] → loss
                                    ↗
  L2 normalize → 멘티 임베딩 (16d)
  ↑
  MLP [62 → 64 → 32 → 16] + ReLU
  ↑
멘티 프로필 (62차원 multi-hot)
```

총 파라미터: 약 8,000개. 모델 크기 ~40KB. 일반 ResNet의 1/10,000.

## 실행 (Colab 또는 로컬)

```bash
pip install numpy torch

# 1) 합성 데이터 3,000건 생성 (~10초)
python ml/mentoring/generate_synthetic_data.py --n 3000

# 2) 학습 (CPU 기준 ~2분, GPU 기준 ~20초)
python ml/mentoring/train_two_tower.py --epochs 20

# → ml/mentoring/data/two_tower_weights.json 생성 (~150KB)
```

## 백엔드 통합

`two_tower_weights.json`을 EC2의 `/home/ubuntu/app/back/two_tower_weights.json`에 업로드하면, Spring Boot 기동 시 자동 로드.

`TwoTowerInferenceService`가 JSON을 읽어 Java forward pass (행렬곱 + ReLU + L2 normalize)를 수행. 외부 ML 런타임(ONNX, PyTorch JNI) 불필요.

`MentoringService`는 다음과 같이 앙상블 점수 계산:
```
finalScore = α · gowerScore + (1 - α) · neuralScore
```
α 기본값 0.5. JSON 미적재 시 자동 폴백 (gowerScore만 사용).

## 학습 데이터 생성 원리 (캡스톤 발표용)

1. 합성 멘토/멘티 프로필 페어 3,000건 생성
2. 도메인 룰(Gower distance)로 similarity 라벨링
3. 5% 가우시안 노이즈로 현실성 추가
4. 50% positive pair (유사) / 30% partial / 20% negative
5. MSE loss로 학습

데이터 1건 누적 없이도 모델 작동 가능 → 콜드스타트 정면 돌파.
실제 멘토 피드백이 쌓이면 fine-tune (다음 phase).

## 발표 정당화

- **자체 학습 모델**: GPT API 의존 없음. 가중치는 우리가 직접 학습.
- **콜드스타트 강건**: 합성 데이터로 부트스트랩 → 실제 피드백 수렴 가능.
- **앙상블 시스템**: 규칙 기반(Gower) + 학습 기반(Neural) → 두 방식 장단점 보완.
- **해석 가능**: 매칭 카드에 항목별 기여도 SHAP-style 시각화.
- **온라인 학습**: Thompson Sampling으로 가중치 자동 튜닝.
