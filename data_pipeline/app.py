import os
from flask import Flask, request, jsonify
from flask_cors import CORS

# 우리가 지금까지 만든 모듈들 불러오기
from src.collectors.albamon_crawler import analyze_albamon_url
from src.preprocessors.entity_matcher import find_business_match
from src.models.shap_explainer import analyze_risk_reason
from src.models.nlp_analyzer import analyze_job_posting

app = Flask(__name__)
CORS(app) # 외부(React Native 앱 등)에서 API 접근을 허용

@app.route('/api/analyze', methods=['POST'])
def analyze_job_risk():
    """
    [POST] /api/analyze
    앱에서 알바몬 URL을 보내면, 전체 AI 파이프라인을 가동하여 위험도 결과를 반환합니다.
    """
    data = request.json
    target_url = data.get('url')

    if not target_url:
        return jsonify({"status": "error", "message": "URL이 제공되지 않았습니다."}), 400

    print(f"\n🚀 [AI 서버] 요청 수신됨! 타겟 URL: {target_url}")

    # ==========================================
    # 1단계: 알바몬 크롤링 (데이터 수집)
    # ==========================================
    crawled_data = analyze_albamon_url(target_url)
    if not crawled_data:
        return jsonify({"status": "error", "message": "알바몬 데이터 추출에 실패했습니다."}), 500

    company_name = crawled_data['company_name']
    address = crawled_data['address']
    job_text = crawled_data['content_snippet']

    # ==========================================
    # 2단계: 사업장 역추적 매칭 (Entity Resolution)
    # ==========================================
    matched_business = find_business_match(company_name, address)
    
    # ==========================================
    # 3단계: AI 위험도 분석 (정형: XGBoost / 비정형: NLP)
    # ==========================================
    final_response = {
        "status": "success",
        "job_info": {
            "title": crawled_data['title'],
            "company_name": company_name,
            "address": address
        },
        "analysis_result": {}
    }

    if matched_business:
        # 3-1. 정형 데이터 분석 (XGBoost + SHAP)
        # (실제로는 매칭된 사업장의 최신 DB 데이터를 불러와야 하지만, 여기서는 테스트용으로 매칭된 데이터를 그대로 사용합니다)
        business_features = {
            'biz_age_months': 12, # 임의값 (실제로는 국세청 업력 연동)
            'turnover_rate': 250.0, # 임의값 (실제로는 국민연금 이직률 연동)
            'chul_count_3y': int(matched_business.get('chul_count_3y', 1)), 
            'industry_risk_score': 75.0
        }
        xgb_score, shap_reasons = analyze_risk_reason(business_features)
        
        final_response["analysis_result"]["xgboost"] = {
            "score": xgb_score,
            "is_risky": xgb_score > 70,
            "reasons": shap_reasons # 앱 화면에 띄워줄 SHAP 설명글
        }
    else:
        final_response["analysis_result"]["xgboost"] = {
            "score": 10, # 체불 이력이 없으므로 기본 안전 점수 부여
            "is_risky": False,
            "message": "고용노동부 체불 명단 및 위험 징후가 발견되지 않은 안전한 사업장입니다."
        }

    # 3-2. 텍스트 데이터 분석 (NLP)
    # nlp_analyzer.py의 함수를 API용으로 살짝 수정하여 점수를 반환받는다고 가정합니다.
    # (현재 nlp_analyzer.py는 print만 하도록 되어있으므로, 실제 서비스 시에는 return으로 값을 넘겨주도록 수정해야 합니다.)
    print("\n🔍 [AI 서버] NLP 텍스트 분석 중...")
    
    # *참고: 임시 테스트용 가짜 NLP 점수 (실제 연동 시 analyze_job_posting(job_text)의 리턴값을 사용)*
    nlp_score = 65 if "수습" in job_text or "당일지급" in job_text else 20
    
    final_response["analysis_result"]["nlp"] = {
        "score": nlp_score,
        "is_risky": nlp_score > 60,
        "message": "공고 본문 분석 결과입니다."
    }

    # ==========================================
    # 4단계: 최종 위험도 종합
    # ==========================================
    xgb_score = final_response["analysis_result"]["xgboost"]["score"]
    total_score = int((xgb_score * 0.7) + (nlp_score * 0.3)) # XGBoost 70%, NLP 30% 가중치 부여
    
    final_response["total_risk_score"] = total_score
    final_response["final_decision"] = "DANGER" if total_score > 70 else ("WARNING" if total_score > 40 else "SAFE")

    print(f"✅ [AI 서버] 분석 완료! 최종 점수: {total_score}점 반환\n")
    return jsonify(final_response)

if __name__ == '__main__':
    # Flask 서버 실행 (포트 5000번)
    print("🌟 AI 파이프라인 서버가 기동되었습니다! (http://localhost:5000)")
    app.run(host='0.0.0.0', port=5000, debug=True)