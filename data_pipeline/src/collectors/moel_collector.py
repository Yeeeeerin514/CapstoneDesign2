import os
import requests
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime

# 1. .env 파일에 숨겨둔 API 키 불러오기
load_dotenv()
API_KEY = os.getenv("DATA_GO_KR_API_KEY")

# 데이터 저장 경로 설정 (data/raw 폴더)
# 현재 스크립트 실행 위치에 상관없이 절대 경로로 깔끔하게 지정합니다.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
os.makedirs(RAW_DATA_DIR, exist_ok=True)

def fetch_wage_theft_data():
    print("🚀 [고용노동부] 임금체불 사업주 데이터 수집을 시작합니다...")

    # API 키가 아직 없거나 기본값일 경우, 막히지 않게 테스트용 가짜(Dummy) 데이터를 만듭니다.
    if not API_KEY or API_KEY == "YOUR_API_KEY_HERE":
        print("⚠️ API 키가 설정되지 않아 파이프라인 테스트용 '더미 데이터'를 생성합니다.")
        create_dummy_data()
        return

    # 실제 공공데이터포털 체불사업주 API 엔드포인트 (가정)
    URL = "http://apis.data.go.kr/B490001/defaulterList/getDefaulterList"
    
    params = {
        "serviceKey": API_KEY,
        "pageNo": "1",
        "numOfRows": "100",  # 한 번에 100개씩 가져옴
        "resultType": "json"
    }

    try:
        # API에 데이터 요청
        response = requests.get(URL, params=params)
        response.raise_for_status() # 에러가 나면 여기서 멈춤
        
        data = response.json()
        
        # 공공데이터 API의 전형적인 JSON 구조 (response -> body -> items)
        items = data.get('response', {}).get('body', {}).get('items', [])

        if items:
            df = pd.DataFrame(items)
            today_str = datetime.now().strftime('%Y%m%d')
            save_path = os.path.join(RAW_DATA_DIR, f"wage_theft_real_{today_str}.csv")
            
            # 한글이 깨지지 않게 utf-8-sig로 인코딩하여 저장
            df.to_csv(save_path, index=False, encoding='utf-8-sig')
            print(f"✅ 실제 데이터 수집 성공! 저장 위치: {save_path}")
        else:
            print("❌ 가져올 데이터가 없습니다. API 응답을 확인해주세요.")

    except Exception as e:
        print(f"❌ 데이터 수집 중 에러가 발생했습니다: {e}")

def create_dummy_data():
    """API 키 승인 대기 중에도 다음 단계(전처리/모델링)를 개발할 수 있도록 돕는 함수"""
    dummy_data = [
        {"biz_number": "123-45-67890", "biz_name": "악덕분식", "owner_name": "김사장", "theft_amount": "2400000", "theft_year": "2023", "address": "서울 마포구"},
        {"biz_number": "234-56-78901", "biz_name": "착취건설", "owner_name": "이소장", "theft_amount": "15000000", "theft_year": "2022", "address": "경기 수원시"},
        {"biz_number": "345-67-89012", "biz_name": "눈물카페", "owner_name": "박점장", "theft_amount": "800000", "theft_year": "2024", "address": "부산 해운대구"},
    ]
    df = pd.DataFrame(dummy_data)
    today_str = datetime.now().strftime('%Y%m%d')
    save_path = os.path.join(RAW_DATA_DIR, f"wage_theft_dummy_{today_str}.csv")
    
    df.to_csv(save_path, index=False, encoding='utf-8-sig')
    print(f"✅ 더미 데이터 저장 완료! 저장 위치: {save_path}")

if __name__ == "__main__":
    fetch_wage_theft_data()