import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, recall_score
from imblearn.over_sampling import SMOTE
import xgboost as xgb
import joblib

# 1. 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
MODEL_DIR = os.path.join(BASE_DIR, "src", "models")
os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

def create_dummy_features():
    """아직 전체 DB가 통합되지 않았으므로, 학습 테스트를 위한 가상(Dummy) 피처 데이터를 생성합니다."""
    print("⚙️ 학습용 더미 피처 데이터를 생성합니다...")
    np.random.seed(42)
    
    # 1000개의 사업장 데이터 생성 (정상 사업장 900개, 체불/위험 사업장 100개 - 불균형 상태)
    n_samples = 1000
    
    data = {
        'biz_number': [f"123-45-{str(i).zfill(4)}" for i in range(n_samples)],
        'biz_age_months': np.random.randint(1, 120, n_samples),      # 업력 (1개월 ~ 10년)
        'turnover_rate': np.random.uniform(0, 500, n_samples),       # 연간 이직률 (0% ~ 500%)
        'chul_count_3y': np.random.choice([0, 1, 2, 3], n_samples, p=[0.85, 0.1, 0.03, 0.02]), # 3년내 체불건수
        'industry_risk_score': np.random.uniform(10, 90, n_samples), # 업종별 평균 위험도
        'is_risky': np.zeros(n_samples, dtype=int)                   # 정답지 (0:안전, 1:위험)
    }
    
    df = pd.DataFrame(data)
    
    # 위험 사업장(1)의 조건 부여 (이직률이 높거나, 체불건수가 있거나, 업력이 너무 짧은 경우)
    df.loc[(df['turnover_rate'] > 300) | (df['chul_count_3y'] > 0) | ((df['biz_age_months'] < 6) & (df['industry_risk_score'] > 70)), 'is_risky'] = 1
    
    file_path = os.path.join(PROCESSED_DATA_DIR, 'training_features_dummy.csv')
    df.to_csv(file_path, index=False)
    return file_path

def train_xgboost_model():
    print("🚀 XGBoost 모델 학습을 시작합니다!")
    
    # 1. 데이터 불러오기
    data_path = os.path.join(PROCESSED_DATA_DIR, 'training_features_dummy.csv')
    if not os.path.exists(data_path):
        data_path = create_dummy_features()
        
    df = pd.read_csv(data_path)
    
    # 학습에 사용할 특성(Features)과 정답(Target) 분리
    feature_cols = ['biz_age_months', 'turnover_rate', 'chul_count_3y', 'industry_risk_score']
    X = df[feature_cols]
    y = df['is_risky']
    
    # 학습용(80%)과 테스트용(20%) 데이터 나누기
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print(f"📊 SMOTE 적용 전 학습 데이터 현황:\n{y_train.value_counts()}")
    
    # 2. 데이터 불균형 해결 (SMOTE 적용)
    smote = SMOTE(random_state=42)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)
    print(f"⚖️ SMOTE 적용 후 학습 데이터 현황:\n{y_train_resampled.value_counts()}")
    
    # 3. XGBoost 모델 정의 및 학습
    # 제안서에 작성하신 하이퍼파라미터 반영 (scale_pos_weight는 SMOTE를 썼으므로 제외해도 무방합니다)
    model = xgb.XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        random_state=42,
        eval_metric='logloss'
    )
    
    model.fit(X_train_resampled, y_train_resampled)
    
    # 4. 모델 평가 (제안서의 목표치: Recall 최우선)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] # 1(위험)이 될 확률
    
    print("\n📈 [모델 평가 결과]")
    print(f"Recall (위험 탐지율 - 가장 중요!): {recall_score(y_test, y_pred):.2f}")
    print(f"AUC-ROC: {roc_auc_score(y_test, y_prob):.2f}")
    print("-" * 30)
    print(classification_report(y_test, y_pred))
    
    # 5. 학습된 모델 저장 (.pkl)
    model_path = os.path.join(MODEL_DIR, 'wage_theft_xgb_model.pkl')
    joblib.dump(model, model_path)
    print(f"💾 모델 저장 완료! 위치: {model_path}")
    
    return model

if __name__ == "__main__":
    trained_model = train_xgboost_model()
    
    # 가상의 새로운 사업장 데이터로 0~100점 점수 뽑아보기 테스트
    print("\n🔮 [실전 테스트] 새로운 사업장 위험도 예측")
    test_business = pd.DataFrame([{
        'biz_age_months': 5,          # 개업 5개월차 (신생)
        'turnover_rate': 340.5,       # 이직률 340% (매우 높음)
        'chul_count_3y': 1,           # 체불 1건 있음
        'industry_risk_score': 85.0   # 원래 체불이 잦은 업종
    }])
    
    # predict_proba는 [안전할 확률, 위험할 확률]을 반환합니다. 위험할 확률에 100을 곱해 점수로 만듭니다.
    risk_probability = trained_model.predict_proba(test_business)[0][1]
    risk_score = int(risk_probability * 100)
    
    print(f"👉 이 사업장의 임금체불 위험도 점수는: {risk_score}점 / 100점")
    if risk_score > 70:
        print("🚨 상태: 위험 (추천에서 원천 배제 필요!)")