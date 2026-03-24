import os
import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import shap

# 1. 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_DIR = os.path.join(BASE_DIR, "src", "models")
MODEL_PATH = os.path.join(MODEL_DIR, 'wage_theft_xgb_model.pkl')

# 피처 이름(영어)을 사용자 친화적인 한글로 번역하는 딕셔너리
FEATURE_NAMES_KO = {
    'biz_age_months': '사업장 업력(개월)',
    'turnover_rate': '연간 이직률(%)',
    'chul_count_3y': '최근 3년 체불건수(건)',
    'industry_risk_score': '업종 평균 위험도'
}

def analyze_risk_reason(business_data):
    """
    특정 사업장의 데이터를 받아 XGBoost 모델의 예측 결과를 SHAP으로 분석하고,
    왜 그런 점수가 나왔는지 이유를 텍스트로 설명해 줍니다.
    """
    print("\n🔍 [AI 모델의 판단 근거(SHAP) 분석 중...]")
    
    # 1. 학습된 XGBoost 모델 불러오기
    if not os.path.exists(MODEL_PATH):
        print("⚠️ 학습된 모델이 없습니다. xgboost_trainer.py를 먼저 실행해주세요.")
        return
    
    model = joblib.load(MODEL_PATH)
    
    # 2. 데이터 프레임으로 변환
    df_test = pd.DataFrame([business_data])
    
    # 예측 점수 (위험할 확률) 계산
    risk_prob = model.predict_proba(df_test)[0][1]
    risk_score = int(risk_prob * 100)
    
    # 3. SHAP Explainer 생성 및 분석 (XGBoost용 TreeExplainer 사용)
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(df_test)
    
    # XGBoost 이진 분류에서 shap_values는 리스트 형태일 수 있으므로 처리
    if isinstance(shap_values, list):
        shap_values_for_class_1 = shap_values[1][0]
    else:
        shap_values_for_class_1 = shap_values[0]

    # 4. 분석 결과 정리
    print(f"\n=========================================")
    print(f"🚨 최종 임금체불 위험도: {risk_score}점 / 100점")
    print(f"=========================================\n")
    
    print("💡 [위험도를 높이거나 낮춘 주요 원인]")
    
    # 각 피처의 영향력을 (영향력 크기, 피처명, 실제값, 기여도) 형태로 묶어 영향력이 큰 순서대로 정렬
    feature_impacts = []
    for i, feature in enumerate(df_test.columns):
        impact = shap_values_for_class_1[i]
        feature_impacts.append({
            'feature': feature,
            'name_ko': FEATURE_NAMES_KO.get(feature, feature),
            'value': df_test.iloc[0, i],
            'impact': impact
        })
        
    # 영향력(절대값) 기준으로 내림차순 정렬
    feature_impacts.sort(key=lambda x: abs(x['impact']), reverse=True)
    
    # 결과 출력 (자연어 형태)
    for item in feature_impacts:
        impact_val = item['impact']
        
        if impact_val > 0.5: # 위험도를 크게 높인 경우
            print(f" 🔺 [경고] {item['name_ko']}이(가) {item['value']}로 매우 높아 위험 점수가 크게 상승했습니다.")
        elif 0 < impact_val <= 0.5:
            print(f" 🔼 [주의] {item['name_ko']}이(가) {item['value']}로 다소 높은 편입니다.")
        elif -0.5 <= impact_val < 0:
            print(f" 🔽 [안정] {item['name_ko']}이(가) {item['value']} 수준으로 정상적이라 점수가 낮아졌습니다.")
        else: # 위험도를 크게 낮춘 경우 (안전 요소)
            print(f" 💙 [매우 안전] {item['name_ko']}이(가) {item['value']}로 훌륭하게 관리되어 위험 점수가 대폭 감소했습니다.")

    print("\n※ 이 분석 결과는 모바일 앱의 '위험 사업장 한 줄 요약' 및 경고 UI에 그대로 활용됩니다.")
    return risk_score, feature_impacts

if __name__ == "__main__":
    # 테스트 케이스 1: 신생업체인데 이직률이 기형적으로 높고 체불 이력이 있는 '최악의 사업장'
    bad_business = {
        'biz_age_months': 3,          # 개업 3개월차
        'turnover_rate': 450.0,       # 이직률 450% (사람이 계속 바뀜)
        'chul_count_3y': 1,           # 체불 1건
        'industry_risk_score': 85.0   # 원래 체불이 잦은 업종
    }
    
    print("--- 🛑 테스트 1: 위험 사업장 분석 ---")
    analyze_risk_reason(bad_business)
    
    print("\n\n")
    
    # 테스트 케이스 2: 5년 넘게 운영되며 이직률도 낮고 체불도 없는 '건실한 사업장'
    good_business = {
        'biz_age_months': 65,         # 개업 5년 이상
        'turnover_rate': 12.5,        # 이직률 12.5% (매우 안정적)
        'chul_count_3y': 0,           # 체불 없음
        'industry_risk_score': 30.0   # 체불이 적은 업종
    }
    
    print("--- ✅ 테스트 2: 안전 사업장 분석 ---")
    analyze_risk_reason(good_business)