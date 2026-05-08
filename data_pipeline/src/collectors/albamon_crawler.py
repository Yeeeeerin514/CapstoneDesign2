import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException

def get_chrome_driver():
    """크롬 드라이버를 백그라운드(Headless) 모드로 실행하는 함수"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # 브라우저 창을 띄우지 않음
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # 봇(Bot) 차단을 막기 위한 User-Agent 설정
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    # webdriver-manager가 현재 PC의 크롬 버전에 맞는 드라이버를 자동 설치/실행해 줍니다.
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    return driver

def analyze_albamon_url(url):
    """알바몬 URL에서 상호명, 주소, 공고 텍스트를 추출하는 함수"""
    print(f"🌐 봇 출동! 다음 URL의 데이터를 수집합니다: {url}")
    driver = get_chrome_driver()
    
    try:
        driver.get(url)
        # 페이지가 완전히 로딩될 때까지 잠시 대기
        time.sleep(3) 

        # 1. 공고 제목 추출
        try:
            title = driver.find_element(By.TAG_NAME, 'h1').text
        except NoSuchElementException:
            title = "제목을 찾을 수 없음"

        # 2. 상호명 (회사명) 추출
        try:
            # 알바몬 상세페이지 구조에 맞춘 CSS 선택자 (알바몬 UI 변경 시 수정 필요할 수 있음)
            company_name = driver.find_element(By.CLASS_NAME, 'company-name').text 
        except NoSuchElementException:
            company_name = "상호명 추출 실패 (또는 비공개)"

        # 3. 주소 (근무지) 추출
        try:
            # 근무지 정보가 담긴 영역 추출
            address = driver.find_element(By.XPATH, "//*[contains(text(), '근무지 주소')]/following-sibling::*").text
        except NoSuchElementException:
            address = "주소 추출 실패"

        # 4. 공고 본문 텍스트 (KoBERT가 분석할 핵심 재료) 추출
        try:
            # 페이지의 전체 텍스트를 가져오거나 특정 본문 클래스를 타겟팅합니다.
            # 여기서는 편의상 body 안의 텍스트를 가져오되, 실전에서는 본문 div 영역을 좁히는 것이 좋습니다.
            content = driver.find_element(By.TAG_NAME, 'body').text
            # 텍스트가 너무 길면 핵심만 자르기 (예: 1000자)
            content_snippet = content[:1000] + "..." if len(content) > 1000 else content
        except NoSuchElementException:
            content_snippet = "본문 추출 실패"

        # 결과 딕셔너리로 묶기
        result = {
            "url": url,
            "title": title,
            "company_name": company_name,
            "address": address,
            "content_snippet": content_snippet
        }
        
        print("✅ 데이터 추출 완료!\n")
        return result

    except Exception as e:
        print(f"❌ 크롤링 중 에러가 발생했습니다: {e}")
        return None
    finally:
        # 작업이 끝나면 메모리를 위해 브라우저를 닫습니다.
        driver.quit()

if __name__ == "__main__":
    # 테스트용 알바몬 공고 URL (실제 존재하는 아무 알바몬 공고 링크나 넣어도 됩니다!)
    # 알바몬 링크 예시: https://www.albamon.com/jobs/detail/xxxxxxx
    test_url = "https://www.albamon.com/jobs/detail/115419412?productCode=dfplatinumvip&space=PC_MAIN&sc=501&pageNo=0&pageIndex=0" # 테스트를 위해 일단 알바몬 메인 화면을 넣어보겠습니다.
    
    # ⚠️ 직접 알바몬에 들어가서 공고 하나를 클릭한 뒤, 그 URL을 아래 변수에 붙여넣어 보세요!
    # test_url = "여기에_실제_공고_URL_붙여넣기"
    
    extracted_data = analyze_albamon_url(test_url)
    
    if extracted_data:
        print("📊 [추출된 데이터 요약]")
        print(f"- 제목: {extracted_data['title']}")
        print(f"- 상호명: {extracted_data['company_name']}")
        print(f"- 주소: {extracted_data['address']}")
        print(f"- 본문 일부: {extracted_data['content_snippet'][:100]}...\n")