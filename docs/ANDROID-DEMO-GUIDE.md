# 📱 안드로이드 시연 준비 가이드

캡스톤 발표용 APK 빌드 + 실기기 테스트 가이드.

## 현재 상태 점검

| 항목 | 상태 |
|---|---|
| `app.json` Android 권한 (카메라/위치/Wi-Fi/사진) | ✅ |
| `app.json` 플러그인 (expo-router, expo-location, expo-notifications, expo-image-picker) | ✅ |
| `eas.json` development/preview/production 프로필 | ✅ |
| **HTTP API cleartext 허용** (`usesCleartextTraffic: true`) | ✅ 방금 추가 |
| `EXPO_PUBLIC_API_URL=http://13.124.178.60:8080/api` | ✅ Front/.env |
| 백엔드 systemd 자동 가동 | ✅ EC2 |
| Two-tower 신경망 적재 | ✅ `nParams=12256` |

## 시연용 빌드 — EAS Development Build (권장)

### 1. EAS CLI 설치 (한 번만)

```bash
npm install -g eas-cli
eas login   # Expo 계정 로그인
```

### 2. 프로젝트 연결 (한 번만)

```bash
cd Front
eas init
# Expo 프로젝트 ID 생성 + app.json에 projectId 자동 주입
```

### 3. APK 빌드 (15~25분)

```bash
cd Front
eas build --platform android --profile preview
# preview = APK (직접 설치 가능), production = AAB (Play Store용)
```

빌드 완료되면 콘솔에 다운로드 URL 출력. 모바일 브라우저로 접속 → APK 다운로드 → 설치.

### 4. 실기기 설치

- 설정 → 보안 → "출처를 알 수 없는 앱" 허용
- APK 파일 탭 → 설치
- 카메라/사진/위치 권한 런타임 요청 시 모두 허용

## 시연 시나리오 (안드로이드 실기기)

| # | 단계 | 사용 기능 |
|---|---|---|
| 1 | 회원가입 → 로그인 | 백엔드 `/api/auth/**` JWT |
| 2 | 홈 탭 → 공고 이미지 분석 (카메라/갤러리) | OpenAI Vision + 법제처 RAG |
| 3 | 관심업장 등록 → 계약서 분석 | 동일 + ContractFactSheet |
| 4 | "사업장 등록하기" → Wi-Fi 스캔 → BSSID 등록 | `/api/working/register-workplace` (실제 DB 저장) |
| 5 | 신고 탭 → 사건 생성 → "연결할 멘토 찾기" | AI 매칭 (Gower + Gale-Shapley + Thompson + Two-tower 앙상블) |
| 6 | 멘토 카드 펼치기 → 앙상블 점수 분해 + 항목별 기여도 | 발표 임팩트 ★★★ |
| 7 | "이 멘토와 매칭하기" → 채팅방 | 백엔드 chat_message DB 영속 + 5초 폴링 |
| 8 | MY 탭 → "★평가" → 피드백 제출 | Thompson Sampling 자동 학습 |
| 9 | 로그아웃 | useAuthStore.clearAuth |

## 안드로이드 전용 기능 (웹에선 안 됨)

- **BSSID 실제 스캔**: `react-native-wifi-reborn` (Android 전용, EAS dev build 필수)
- **카메라 실촬영**: `expo-image-picker`
- **백그라운드 위치**: 출퇴근 자동 감지 (기획 단계)
- **앱 아이콘/스플래시**: app.json의 icon/splash 적용

## 알려진 한계 (캡스톤 시연에서 언급할 부분)

| 항목 | 상태 |
|---|---|
| 결제 PG 연동 | mock (실제 결제 X) |
| FCM 푸시 | 토큰 등록 안 됨 |
| 진정서 PDF | 텍스트 초안만 |
| 시드 멘토 901~905 | 더미 (실제 멘토 응답 불가) — 시연 시 본인 계정 멘토로 추가 등록 권장 |

## 빠른 트러블슈팅

### "네트워크 요청 실패" (Android)
- `app.json` `usesCleartextTraffic: true` 확인 (이미 추가됨)
- EC2 헬스: `curl http://13.124.178.60:8080/api/health` UP 확인
- Wi-Fi가 EC2에 접근 가능한지 (학교 Wi-Fi가 외부 트래픽 차단 시 핫스팟 사용)

### "BSSID 스캔 안 됨"
- Expo Go에서는 작동 안 함 → 반드시 `eas build --profile development` 또는 `preview` APK 사용
- 위치 권한 + Wi-Fi 권한 둘 다 허용 필요 (Android 10+)

### 빌드 실패
- `eas build` 무료 티어 월 30회 제한. 매번 큐 대기 시간 5~15분.
- 빠른 디버그: `npx expo run:android` (Android Studio + 안드로이드 에뮬레이터 필요)

## 발표 데모 직전 체크리스트

- [ ] EC2 헬스체크 (`curl http://13.124.178.60:8080/api/health` → UP)
- [ ] 시드 멘토 5명 DB 확인 (`SELECT count(*) FROM mentor_profile` = 5+)
- [ ] Two-tower 가중치 적재 확인 (로그 `nParams=12256`)
- [ ] APK 설치된 안드로이드 기기 + 인터넷 연결
- [ ] 본인 계정 + 시드 사건 1개 미리 생성 (resolved 상태) — 본인 멘토 등록 시연용
- [ ] 발표 직전 로그아웃 → 회원가입부터 시연 가능
