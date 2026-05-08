import os
import requests
import pandas as pd
import json
from dotenv import load_dotenv
from datetime import datetime

# 1. .env 파일에 숨겨둔 API 키 불러오기
load_dotenv()
API_KEY = os.getenv("DATA_GO_KR_API_KEY")

# 데이터 저장 경로 설정 (data/raw 폴더)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
os.makedirs(RAW_DATA_DIR, exist_ok=True)

def check_business_status(b_no_list):
    print("🏢 [국세청] 사업자등록 상태 조회(휴폐업 등) 수집을 시작할게...")

    # API 키가 아직 없으면 더미 데이터로 테스트!
    if not API_KEY or API_KEY == "YOUR_API_KEY_HERE":
        print("⚠️ API 키가 설정되지 않아서 테스트용 '더미 데이터'를 생성할게.")
        return create_dummy_data(b_no_list)

    # 국세청 사업자 상태 조회 API URL (공공데이터포털 기준)
    url = "https://api.odcloud.kr/api/nts-businessman/v1/status"
    
    params = {"serviceKey": API_KEY}
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # 국세청 API는 하이픈(-)을 뺀 숫자만 요구하므로 전처리
    clean_b_no_list = [b.replace("-", "") for b in b_no_list]
    
    # POST 요청을 위한 JSON 페이로드 (한 번에 최대 100개까지 조회 가능)
    payload = {"b_no": clean_b_no_list}

    try:
        # 국세청 API는 GET이 아니라 POST 방식으로 데이터를 보내야 해
        response = requests.post(url, params=params, headers=headers, data=json.dumps(payload))
        response.raise_for_status() 
        
        data = response.json()
        
        # 'data' 키 안에 우리가 원하는 결과 배열이 들어있음
        if "data" in data:
            df = pd.DataFrame(data["data"])
            today_str = datetime.now().strftime('%Y%m%d')
            save_path = os.path.join(RAW_DATA_DIR, f"nts_status_{today_str}.csv")
            
            # CSV로 예쁘게 저장
            df.to_csv(save_path, index=False, encoding='utf-8-sig')
            print(f"✅ 실제 국세청 데이터 수집 성공! 저장 위치: {save_path}")
            return df
        else:
            print("❌ 조회된 데이터가 없어. API 응답을 확인해봐.")
            return None

    except Exception as e:
        print(f"❌ 데이터 수집 중 에러가 발생했어: {e}")
        return None

def create_dummy_data(b_no_list):
    """API 키 승인 대기 중에도 개발을 멈추지 않게 해주는 더미 데이터 생성기"""
    dummy_data = []
    for b_no in b_no_list:
        dummy_data.append({
            "b_no": b_no.replace("-", ""),
            "b_stt_cd": "01",  # 01: 계속사업자, 02: 휴업, 03: 폐업
            "b_stt": "계속사업자",
            "tax_type": "부가가치세 일반과세자",
            "utcc_yn": "N"
        })
        
    df = pd.DataFrame(dummy_data)
    today_str = datetime.now().strftime('%Y%m%d')
    save_path = os.path.join(RAW_DATA_DIR, f"nts_status_dummy_{today_str}.csv")
    
    df.to_csv(save_path, index=False, encoding='utf-8-sig')
    print(f"✅ 국세청 더미 데이터 저장 완료! 저장 위치: {save_path}")
    return df

if __name__ == "__main__":
    # 테스트용 사업자번호 리스트 (실제 나중에 알바몬에서 역추적한 번호들이 들어갈 자리야)
    test_biz_numbers = ["123-45-67890", "234-56-78901", "345-67-89012"]
    check_business_status(test_biz_numbers)