import os
import pandas as pd
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset

# 1. 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_SAVE_DIR = os.path.join(BASE_DIR, "src", "models", "saved_nlp_model")

def create_dummy_text_data():
    """AI가 '어떤 문장이 위험한지' 학습할 수 있도록 가상의 정답지(텍스트 데이터)를 만듭니다."""
    print("📝 텍스트 학습용 데이터를 준비합니다...")
    data = [
        {"text": "가족같은 분위기! 초보자 환영합니다. 주휴수당 챙겨드려요.", "label": 0}, # 0: 안전
        {"text": "시급 11000원, 4대보험 가입, 퇴직금 지급", "label": 0},
        {"text": "휴게시간 1시간 보장, 식대 별도 지급합니다.", "label": 0},
        {"text": "수습기간 3개월 동안은 최저임금의 80%만 지급합니다.", "label": 1}, # 1: 불법/위험
        {"text": "4대보험 미가입 조건입니다. 현금으로 당일 지급해요.", "label": 1},
        {"text": "퇴직금 없음, 지각시 벌금 1만원 차감합니다.", "label": 1},
        {"text": "급여일은 매월 말일이며 변동될 수 있습니다.", "label": 1}
    ]
    return pd.DataFrame(data)

def train_nlp_model():
    print("🚀 한국어 언어 모델(KcELECTRA) 파인튜닝을 시작합니다!")
    
    # 1. 한국어 텍스트 분석에 특화된 사전학습 모델과 토크나이저 불러오기
    MODEL_NAME = "beomi/KcELECTRA-base-v2022"
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    
    # 레이블이 2개(0:안전, 1:위험)인 분류 모델 불러오기
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=2)
    
    # 2. 데이터 준비 및 토큰화(Tokenization)
    df = create_dummy_text_data()
    dataset = Dataset.from_pandas(df)
    
    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=128)
    
    tokenized_datasets = dataset.map(tokenize_function, batched=True)
    
    # 학습/검증 데이터 스플릿 (데이터가 적으므로 일단 전체를 학습에 사용)
    train_dataset = tokenized_datasets
    
    # 3. 학습 설정 (TrainingArguments)
    training_args = TrainingArguments(
        output_dir=MODEL_SAVE_DIR,
        num_train_epochs=3,              # 3번 반복 학습
        per_device_train_batch_size=4,
        save_steps=10,
        logging_steps=2,
        learning_rate=2e-5,
    )
    
    # 4. 트레이너(Trainer) 객체 생성 및 학습 진행
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
    )
    
    print("⏳ 모델이 문장의 문맥을 공부하고 있습니다. 잠시만 기다려주세요...")
    trainer.train()
    
    # 5. 학습된 모델 및 토크나이저 저장
    model.save_pretrained(MODEL_SAVE_DIR)
    tokenizer.save_pretrained(MODEL_SAVE_DIR)
    print(f"💾 NLP 모델 학습 및 저장 완료! 위치: {MODEL_SAVE_DIR}")

def analyze_job_posting(text):
    """학습된 모델을 바탕으로 새로운 구인공고 텍스트의 위험도를 예측합니다."""
    # 저장된 모델과 토크나이저 불러오기
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_SAVE_DIR)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_SAVE_DIR)
    except Exception:
        print("⚠️ 저장된 모델이 없습니다. 먼저 모델을 학습시켜주세요!")
        return
    
    # 입력된 텍스트를 숫자로 변환 (토큰화)
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=128)
    
    # 모델에 텍스트를 넣고 결과 예측
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        # Softmax를 적용하여 확률값(0~1)으로 변환
        probabilities = torch.nn.functional.softmax(logits, dim=-1)
        
    # [안전할 확률, 위험할 확률] 중 '위험할 확률' 추출
    risk_prob = probabilities[0][1].item()
    risk_score = int(risk_prob * 100)
    
    print("\n🔍 [구인공고 텍스트 분석 결과]")
    print(f"분석한 텍스트: '{text}'")
    print(f"👉 텍스트 위험도 점수: {risk_score}점 / 100점")
    if risk_score > 60:
        print("🚨 상태: 위험 (근로기준법 위반 의심 문구 발견!)")
    else:
        print("✅ 상태: 안전 (특이사항 없음)")

if __name__ == "__main__":
    # 1. 처음 실행할 때는 모델을 먼저 학습시켜야 합니다.
    # (학습이 끝나면 이 부분을 주석 처리하고 아래 분석만 실행해도 됩니다.)
    train_nlp_model()
    
    # 2. 알바몬에서 크롤링해 온 새로운 텍스트를 분석해 봅니다.
    test_text_1 = "급구!! 내일부터 바로 출근 가능하신 분. 현금으로 일당 지급합니다. 4대보험 미가입."
    analyze_job_posting(test_text_1)
    
    test_text_2 = "맥도날드 홍대점 크루 모집합니다. 주휴수당, 야간수당 철저히 챙겨드립니다. 근로계약서 필수 작성."
    analyze_job_posting(test_text_2)