import os
import glob
import pandas as pd
import difflib
import re

# 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")

def clean_text(text):
    """(주), 주식회사, 특수문자, 공백 등을 제거하여 핵심 상호명만 남기는 정제 함수"""
    if not isinstance(text, str):
        return ""
    # 1. (주), 주식회사 등 불필요한 단어 제거
    text = re.sub(r'\(주\)|주식회사|㈜', '', text)
    # 2. 특수문자 및 공백 모두 제거
    text = re.sub(r'[^가-힣A-Za-z0-9]', '', text)
    return text

def extract_city_district(address):
    """주소에서 '시/도'와 '시/군/구'만 추출 (예: 서울 마포구)"""
    if not isinstance(address, str):
        return ""
    parts = address.split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[1]}" # 서울특별시 마포구 -> 서울특별시 마포구
    return address

def load_latest_wage_theft_data():
    """가장 최근에 수집된 고용노동부 체불 명단 CSV 파일을 불러옵니다."""
    # raw 폴더에 있는 wage_theft_*.csv 파일 중 가장 최신 파일 찾기
    csv_files = glob.glob(os.path.join(RAW_DATA_DIR, "wage_theft_*.csv"))
    if not csv_files:
        print("⚠️ 고용노동부 데이터 파일이 없습니다. 먼저 수집기를 실행해주세요.")
        return None
    
    latest_file = max(csv_files, key=os.path.getctime)
    df = pd.read_csv(latest_file)
    return df

def find_business_match(target_name, target_address):
    """크롤링한 상호명/주소를 고용노동부 명단과 대조하여 사업자번호 및 위험 여부를 찾습니다."""
    print(f"\n🔍 매칭 시작: [{target_name}] ({target_address})")
    
    df_moel = load_latest_wage_theft_data()
    if df_moel is None:
        return None

    # 1. 크롤링 데이터 정제
    clean_target_name = clean_text(target_name)
    target_region = extract_city_district(target_address)

    best_match = None
    highest_ratio = 0.0

    # 2. 고용노동부 명단 순회하며 유사도 검사
    for index, row in df_moel.iterrows():
        # 컬럼명은 수집기(moel_collector.py)에서 만든 더미 데이터 기준입니다.
        db_name = row.get('biz_name', '')
        db_address = row.get('address', '')
        
        clean_db_name = clean_text(db_name)
        db_region = extract_city_district(db_address)

        # 지역(시/구)이 다르면 아예 다른 가게이므로 패스! (속도 최적화)
        # 단, 둘 중 하나라도 주소 정보가 부족하면 상호명만으로 검사합니다.
        if target_region and db_region and target_region[:2] != db_region[:2]:
            continue

        # 이름 유사도 계산 (0.0 ~ 1.0)
        similarity = difflib.SequenceMatcher(None, clean_target_name, clean_db_name).ratio()

        if similarity > highest_ratio:
            highest_ratio = similarity
            best_match = row

    # 3. 유사도가 80% 이상이면 같은 가게로 간주
    if highest_ratio >= 0.8:
        print(f"🚨 [경고] 체불 이력이 있는 사업장과 {highest_ratio*100:.0f}% 일치합니다!")
        print(f"   - 매칭된 사업장: {best_match['biz_name']} (사업자번호: {best_match['biz_number']})")
        print(f"   - 누적 체불액: {best_match['theft_amount']}원")
        return best_match.to_dict()
    else:
        print("✅ 체불 명단에 일치하는 사업장이 없습니다. (안전 데이터 기반)")
        return None

if __name__ == "__main__":
    # 상황 1: 알바몬에서 긁어온 가게가 실제로 고용노동부 명단(더미)에 있는 경우
    print("--- 테스트 1 (위험 사업장) ---")
    find_business_match(target_name="악덕 분식 (주)", target_address="서울특별시 마포구 서교동 123-4")
    
    # 상황 2: 명단에 없는 착한 가게인 경우
    print("\n--- 테스트 2 (안전 사업장) ---")
    find_business_match(target_name="천사 카페", target_address="서울특별시 강남구 역삼동")