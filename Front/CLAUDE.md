# CLAUDE.md

이 파일은 AI 코딩 어시스턴트(Cursor, Claude Code 등)가 이 레포지토리에서 작업할 때 반드시 따라야 하는 **절대 규칙서**입니다. 코드를 생성하거나 수정할 때 이 파일을 항상 먼저 읽고 모든 규칙을 준수하십시오.

---

## 프로젝트 개요

**알바지킴이** — 아르바이트생의 노동 권리를 보호하는 Android 앱.
Wi-Fi BSSID 기반 자동 출퇴근 기록, 근로계약서 AI 분석, 임금체불 진정서 자동 생성, 멘토-멘티 매칭 기능을 포함합니다.

---

## 언어 지침

모든 결과값, 주석, 설명, 응답은 반드시 **한글**로 작성합니다.
단, 코드 내 변수명·함수명·타입명은 **영어 camelCase/PascalCase**를 사용합니다.

---

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | **React Native (Expo SDK 51)** |
| 라우팅 | **Expo Router v3** (파일 기반) |
| 언어 | **TypeScript strict** |
| 스타일링 | **NativeWind v4** (Tailwind 문법) |
| 상태관리 | **Zustand** |
| HTTP | **Axios** |
| AI | **Anthropic Claude API** (계약서 분석, 공고 검증, 진정서 생성) |
| BSSID | **react-native-wifi-reborn** (Android 전용) |
| 위치 | **expo-location** |
| 알림 | **expo-notifications** |
| 아키텍처 | **Feature-Sliced Design (FSD)** |
| 경로 별칭 | `@/*` → `./src/*` (절대 상대경로 `../../` 사용 금지) |

---

## 아키텍처: Feature-Sliced Design (FSD)

### 핵심 원칙: 단방향 의존성

상위 레이어는 하위 레이어만 import할 수 있습니다. **역방향 import는 절대 금지**입니다.

```
app  →  views  →  widgets  →  features  →  entities  →  shared
```

| from \ to | shared | entities | features | widgets | views | app |
|-----------|:------:|:--------:|:--------:|:-------:|:-----:|:---:|
| **shared**   | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **entities** | ✅ | ❌¹ | ❌ | ❌ | ❌ | ❌ |
| **features** | ✅ | ✅ | ❌¹ | ❌ | ❌ | ❌ |
| **widgets**  | ✅ | ✅ | ✅ | ❌¹ | ❌ | ❌ |
| **views**    | ✅ | ✅ | ✅ | ✅ | ❌¹ | ❌ |
| **app**      | ✅ | ✅ | ✅ | ✅ | ✅ | — |

¹ **같은 레이어끼리 직접 import 금지.** 한 단계 위에서 조합하세요.

### 레이어별 책임

- **`shared/`**: 도메인 무관 순수 자원. axios 인스턴스, 유틸 함수, 공통 UI 컴포넌트, 타입, 상수, 수당 계산 유틸. 비즈니스 로직 절대 금지.
- **`entities/`**: 비즈니스 도메인 최소 단위 (workplace, contract, attendance, report, user, mentor). 타입 정의, API fetch 함수, 표현용 UI.
- **`features/`**: 사용자가 수행하는 단일 인터랙션 (check-in, contract-upload, bssid-scan, report-submit, job-verify, mentor-match). Zustand store + 폼/버튼/핸들러.
- **`widgets/`**: 여러 features/entities를 조합한 독립 UI 블록 (AttendanceCard, ContractAnalysisResult, WorkDashboard, ReportForm).
- **`views/`**: 라우트별 화면 조립. 비즈니스 로직 직접 작성 금지. widget/feature/entity를 배치만 함.
- **`app/`**: Expo Router 파일 기반 라우팅 셸. `app/(tabs)/index.tsx`는 `views/`의 컴포넌트를 import해서 반환만 함.

### 슬라이스 Public API 규칙

외부에서 슬라이스 내부 파일을 직접 import하는 것은 **절대 금지**입니다. 반드시 `index.ts`를 경유하세요.

```typescript
// ✅ 올바른 방법
import { CheckInModal } from "@/features/check-in";
import { Workplace } from "@/entities/workplace";

// ❌ 금지 — 내부 파일 직접 접근
import { CheckInModal } from "@/features/check-in/ui/CheckInModal";
```

### 슬라이스 내부 폴더 구조

```
<slice>/
 ├─ ui/       # React Native 컴포넌트
 ├─ model/    # Zustand store, 타입, 비즈니스 로직
 ├─ api/      # 서버 통신 함수 (axios, Claude API)
 ├─ lib/      # 슬라이스 내부 전용 헬퍼
 └─ index.ts  # Public API (외부에 노출할 것만 export)
```

---

## 코딩 컨벤션

### TypeScript

- `strict: true` 필수. `any` 타입 사용 금지. 불가피하면 `unknown` 사용 후 타입 가드 적용.
- 모든 함수의 반환 타입 명시.
- `interface`는 도메인 객체(entities)에, `type`은 유틸리티/유니온에 사용.
- 선택적 체이닝(`?.`)과 nullish 병합(`??`) 적극 활용.

### 컴포넌트

- 함수형 컴포넌트만 사용. `React.FC` 타입 사용 금지 (명시적 props 타입 선언).
- 컴포넌트 파일명: `PascalCase.tsx`
- 훅 파일명: `use-kebab-case.ts`
- 유틸 파일명: `kebab-case.ts`

```typescript
// ✅ 올바른 컴포넌트 선언
interface Props {
  title: string;
  onPress: () => void;
}

export function WorkplaceCard({ title, onPress }: Props) {
  return (/* ... */);
}

// ❌ 금지
const WorkplaceCard: React.FC<Props> = ({ title, onPress }) => (/* ... */);
```

### Zustand Store 패턴

모든 feature store는 다음 패턴을 따릅니다:

```typescript
// src/features/<action>/model/store.ts
import { create } from "zustand";

interface <Action>State {
  // 상태값
  field: string;
  isSubmitting: boolean;
  error: string | null;
  // setter 함수
  setField: (v: string) => void;
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

const initialState = {
  field: "",
  isSubmitting: false,
  error: null,
};

export const use<Action>Store = create<<Action>State>((set) => ({
  ...initialState,
  setField: (field) => set({ field }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
```

### API 함수 패턴

```typescript
// src/entities/<entity>/api/<action>.ts
import { apiClient } from "@/shared/api/axios-instance";
import type { <Entity> } from "../model/types";

export async function fetch<Entity>(id: string): Promise<<Entity>> {
  const { data } = await apiClient.get<<Entity>>(`/<entities>/${id}`);
  return data;
}
```

### Claude API 호출 패턴

```typescript
// src/entities/contract/api/analyze-contract.ts
import { claudeClient } from "@/shared/api/axios-instance";

export async function analyzeContract(imageBase64: string): Promise<AnalysisResult> {
  const { data } = await claudeClient.post("/messages", {
    model: "claude-opus-4-5",
    max_tokens: 2000,
    messages: [/* ... */],
  });
  // content[0].text를 JSON.parse
  const text = data.content[0].text;
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}
```

### 스타일링 (NativeWind)

- 인라인 스타일(`StyleSheet.create`) 사용 금지. NativeWind className만 사용.
- 색상 토큰은 `tailwind.config.js`의 커스텀 컬러를 사용.

```typescript
// ✅ 올바른 스타일
<View className="flex-1 bg-surface px-4 pt-6">
  <Text className="text-lg font-bold text-gray-900">제목</Text>
</View>

// ❌ 금지
<View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
```

### 에러 처리

모든 API 호출은 try-catch로 감싸고, 에러는 store의 `setError`로 전달합니다.

```typescript
async function handleSubmit() {
  s.setSubmitting(true);
  s.setError(null);
  try {
    await someApiCall();
    s.reset();
  } catch (err) {
    s.setError(err instanceof Error ? err.message : "오류가 발생했어요");
  } finally {
    s.setSubmitting(false);
  }
}
```

---

## 폴더 구조

```
src/
├── app/                          # Expo Router 진입점
│   ├── _layout.tsx               # 루트 레이아웃
│   ├── (tabs)/
│   │   ├── _layout.tsx           # GNB 탭 바
│   │   ├── index.tsx             # 홈 (공고 검증)
│   │   ├── workplace.tsx         # 관심업장
│   │   ├── work-record.tsx       # 근무기록
│   │   ├── report.tsx            # 신고
│   │   └── my.tsx                # 마이페이지
│   └── work-record/
│       └── [id].tsx              # 근무 대시보드 상세
├── views/
├── widgets/
├── features/
│   ├── check-in/                 # 출근 처리
│   ├── check-out/                # 퇴근 처리
│   ├── overtime/                 # 연장근무 설정
│   ├── contract-upload/          # 계약서 업로드
│   ├── bssid-scan/               # BSSID Wi-Fi 스캔
│   ├── job-verify/               # 공고 검증 (AI)
│   ├── report-submit/            # 신고서 제출
│   ├── mentor-match/             # 멘토-멘티 매칭
│   └── solidarity/               # 연대 매칭
├── entities/
│   ├── workplace/                # 업장 도메인
│   ├── contract/                 # 계약서 도메인
│   ├── attendance/               # 출퇴근 기록 도메인
│   ├── report/                   # 신고 도메인
│   ├── user/                     # 유저 도메인
│   └── mentor/                   # 멘토 도메인
└── shared/
    ├── ui/                       # 공통 컴포넌트 (Button, Card, Badge, Input)
    ├── lib/
    │   ├── utils.ts
    │   ├── format-date.ts
    │   └── wage-calculator.ts    # 수당 계산 (최저임금, 연장수당, 야간수당)
    ├── api/
    │   └── axios-instance.ts     # apiClient + claudeClient
    └── config/
        └── env.ts
```

---

## Android 전용 기능 주의사항

### BSSID 스캔

- `react-native-wifi-reborn`은 **Android 전용**입니다.
- 플랫폼 체크 필수:

```typescript
import { Platform } from "react-native";

if (Platform.OS !== "android") {
  throw new Error("BSSID 기능은 Android에서만 사용 가능합니다");
}
```

- BSSID 스캔은 `ACCESS_FINE_LOCATION` 권한이 반드시 필요합니다.
- 개발 빌드(`eas build --profile development`)에서만 실제 Wi-Fi 스캔 동작. Expo Go에서는 불가.

### 백그라운드 위치

- 출퇴근 자동 감지를 위해 백그라운드 위치 권한(`ACCESS_BACKGROUND_LOCATION`) 필요.
- Android 11+ 에서는 별도 권한 요청 다이얼로그가 필요합니다.

---

## 브랜치 & 커밋 컨벤션

### 브랜치 전략

- `main` — 배포 가능 상태. 직접 push 금지. PR로만 머지.
- `feature/<기능명>` — 새 기능. 예: `feature/bssid-scan`, `feature/contract-analysis`
- `fix/<버그명>` — 버그 수정. 예: `fix/overtime-calculation`
- `chore/<작업명>` — 설정/리팩토링. 예: `chore/setup-expo-router`

### 커밋 메시지 Prefix

| Prefix | 사용 시점 |
|---|---|
| `feat:` | 새 기능 추가 |
| `fix:` | 버그 수정 |
| `chore:` | 빌드 설정, 패키지 업데이트 |
| `docs:` | 문서 수정 |
| `refactor:` | 기능 변경 없는 코드 정리 |
| `style:` | 스타일(UI) 수정 |
| `test:` | 테스트 추가/수정 |

---

## 스크립트

| 커맨드 | 설명 |
|---|---|
| `npx expo start` | 개발 서버 시작 |
| `npx expo start --android` | Android 에뮬레이터 실행 |
| `eas build --platform android --profile development` | 개발 빌드 (BSSID 테스트용) |
| `eas build --platform android --profile production` | 프로덕션 APK 빌드 |
| `npx tsc --noEmit` | TypeScript 타입 검사 |
| `npx eslint src --ext .ts,.tsx` | 린트 검사 |

---

## 환경변수

`.env.local` 파일에 다음 변수를 설정합니다. 절대 git에 커밋하지 마세요.

```
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...
```

`EXPO_PUBLIC_` 접두사가 붙은 변수만 클라이언트 코드에서 접근 가능합니다.

---

# 부록 A. 프로젝트 종합 가이드 (현재 상태 스냅샷)

> 이 부록은 새 AI 에이전트 세션이 사용자 첨부 없이도 프로젝트 전체 맥락을 파악할 수 있도록, 실제 파일 구조와 각 파일의 역할/현재 데이터 모양을 정리한 참고 문서입니다. 코드가 변경되면 이 부록도 함께 갱신해야 합니다.

## A.0 한눈에 보기

| 항목 | 값 |
|---|---|
| 앱 이름 | **알바지킴이** (Android 중심 React Native 앱) |
| 기술 스택 | Expo SDK 51 · expo-router v3 · TypeScript strict · NativeWind v4(Tailwind) · Zustand · Axios · Anthropic SDK |
| 빌드 | EAS (development APK / production AAB) |
| 라우팅 진입점 | `expo-router/entry` → `src/app/_layout.tsx` |
| 경로 별칭 | `@/* → ./src/*` (`tsconfig.json`) |
| 아키텍처 | **Feature-Sliced Design (FSD)** — `app → views → widgets → features → entities → shared` |
| 백엔드 베이스 URL | `EXPO_PUBLIC_API_URL` (기본 `http://localhost:8080`) |
| AI 베이스 URL | Anthropic `/v1/messages` (`EXPO_PUBLIC_ANTHROPIC_KEY` 필요) |
| 최저시급 | 2026년 = **10,320원** — 백엔드 `GET /api/minimum-wage`를 부팅 시 받아 `shared/lib/minimum-wage-store.ts`에 캐싱 (프론트 하드코딩 아님, 폴백만 10,320) |

## A.1 핵심 도메인 흐름 (현재 활성)

| 사용자 행동 | 진입 화면 | 주 사용 슬라이스 |
|---|---|---|
| 공고 캡쳐 이미지 분석 → 별 toggle | `views/home/HomeView` → 오버레이 `JobAnalysisResultView` | `entities/job-post`, `features/favorite-workplace`, `shared/ui/Toast` |
| 관심업장 목록 → 계약서 업로드(다중) → 분석 결과 | `views/workplace/{WorkplaceView, ContractUploadView, ContractAnalysisView}` | `features/contract-upload`, `entities/job-post`, `features/favorite-workplace` |
| 계약서 수정 흐름 (이미 업로드된 경우) | `views/workplace/ContractEditView` | `features/favorite-workplace`(`markContractUploaded`/`updateContractAnalysis`) |
| BSSID 등록 → 사업장 등록 완료 | `views/workplace/{BssidRegisterView, BssidRegisterCompleteView}` | `features/bssid-scan`, `features/favorite-workplace` |
| 근무기록 탭 → 업장 카드 → 대시보드(근무중/오프라인 + 통계 + 최근기록) | `views/work-record/{WorkRecordView, WorkDashboardView}` (내부 화면 전환, 탭 바 유지) | `entities/attendance`, `features/favorite-workplace`, `features/report-submit` |
| 근무 달력 보기 | `views/work-record/WorkCalendarView` | `entities/attendance` (mock) |
| 임금체불 신고 시작(코치 흐름) | 대시보드 하단 빨간 카드 → `views/report/{ReportEmptyView, ReportListView, ReportDetailView}` | `features/report-submit`(useReportStore), `entities/report` (`ReportCase`) |
| 로그인/회원가입 | `app/login.tsx` | `entities/user` (`useAuthStore`) |

**레거시(살아 있지만 호출 안 되는 그룹)**:
- `entities/contract` + `features/job-verify` + `widgets/job-verify` + `features/contract-upload/ui/ContractUploadForm` — 옛 Claude API 직접 호출 흐름. 새 기능은 절대 여기에 추가하지 말 것.
- `widgets/{attendance-card,dashboard,report-form,contract-analysis}` — 모두 스켈레톤. 어디서도 import 안 됨.

## A.2 디렉터리 트리

```
src/
├─ app/                          # expo-router 파일 기반 라우팅
│   ├─ _layout.tsx               # Root Stack (index, (tabs), work-record/[id], login)
│   ├─ index.tsx                 # token 있으면 (tabs)로, 없으면 /login 리다이렉트
│   ├─ login.tsx                 # 로그인/회원가입 (StyleSheet 사용 — 다른 곳과 톤 다름)
│   ├─ (tabs)/                   # 하단 GNB 5탭 (Ionicons)
│   │   ├─ _layout.tsx           # 탭 아이콘 매핑
│   │   ├─ index.tsx             # → HomeView
│   │   ├─ workplace.tsx         # → WorkplaceView
│   │   ├─ work-record.tsx       # → WorkRecordView
│   │   ├─ report.tsx            # → ReportView
│   │   └─ my.tsx                # → MyView
│   └─ work-record/[id].tsx      # 동적 라우트 — 현재 <Redirect href="/(tabs)/work-record"/>
│
├─ shared/
│   ├─ api/axios-instance.ts
│   ├─ config/env.ts
│   ├─ lib/{utils.ts, format-date.ts, wage-calculator.ts}
│   └─ ui/{Button.tsx, Card.tsx, Badge.tsx, Input.tsx, ScreenHeader.tsx, Toast.tsx, tokens.ts, index.ts}
│
├─ entities/                     # 도메인 최소 단위 (타입 + api + ui)
│   ├─ job-post/                 # ⭐ 현재 활성 분석 도메인
│   ├─ contract/                 # 레거시
│   ├─ workplace/                # 백엔드 도메인 (API 매퍼 포함)
│   ├─ attendance/               # 출퇴근 모델 + mock + dev 시뮬레이션 store
│   ├─ user/                     # 인증 store + 타입
│   ├─ mentor/                   # 멘토 도메인 (스켈레톤)
│   └─ report/                   # 레거시 Report + 새 ReportCase 모델 공존
│
├─ features/
│   ├─ favorite-workplace/       # ⭐ 관심업장 store (메모리 영속)
│   ├─ contract-upload/          # ⭐ 다중 파일 업로드 store (신규)  + ContractUploadForm(레거시 ui)
│   ├─ bssid-scan/               # Wi-Fi 스캔 (mock 토글) + store
│   ├─ report-submit/            # ⭐ useReportStore (신고 코치 흐름)
│   ├─ check-in/, check-out/, overtime/   # 스켈레톤 (출퇴근 모달/연장근무 form)
│   ├─ mentor-match/             # 스켈레톤
│   ├─ solidarity/               # 스켈레톤
│   └─ job-verify/               # 레거시 — 어디서도 import 안 함
│
├─ widgets/                      # ⚠ 전부 스켈레톤/레거시 — 현재 미사용
│   ├─ job-verify/, contract-analysis/, attendance-card/, dashboard/, report-form/
│
└─ views/                        # 화면 조립
    ├─ home/{HomeView, JobAnalysisResultView}
    ├─ workplace/{WorkplaceView, ContractUploadView, ContractAnalysisView, ContractEditView, BssidRegisterView, BssidRegisterCompleteView}
    ├─ work-record/{WorkRecordView, WorkDashboardView, WorkCalendarView}
    ├─ report/{ReportView, ReportEmptyView, ReportListView, ReportDetailView}
    └─ my/MyView (스켈레톤)
```

## A.3 `src/app/` — 라우팅 셸

| 파일 | 역할 | 비고 |
|---|---|---|
| `_layout.tsx` | Root `Stack`. `index`, `(tabs)`, `work-record/[id]`, `login` 등록. `global.css`(NativeWind) import. header 숨김. |  |
| `index.tsx` | `useAuthStore.token` 유무로 `/(tabs)` ↔ `/login` 리다이렉트. | 토큰 메모리만 — 재시작 시 휘발. |
| `login.tsx` | 로그인/회원가입 토글. `axios.post(.../auth/login\|signup)` → `setAuth`. | 인라인 StyleSheet (유일하게 NativeWind 미사용). |
| `(tabs)/_layout.tsx` | 5탭(홈/관심업장/근무기록/신고/MY) + Ionicons focused/outline 토글. | active `#2563EB`, inactive `#94A3B8`. |
| `(tabs)/index.tsx` ~ `my.tsx` | 각 view 컴포넌트 렌더만. |  |
| `work-record/[id].tsx` | `<Redirect href="/(tabs)/work-record"/>`만 반환 — 옛 deep-link 호환용. | 실제 대시보드는 WorkRecordView 안 내부 화면 전환. |

## A.4 `src/shared/` — 도메인 무관 공통 자원

### `shared/api/axios-instance.ts`
- `apiClient`: `env.apiUrl` 기반. **요청 인터셉터에서 `useAuthStore.getState().token` 동적 `require` → Bearer 자동 주입**. 순환 import 회피 trick.
- `claudeClient`: `https://api.anthropic.com/v1` 직접 호출. `anthropic-version: 2023-06-01`, `x-api-key`. (현재는 레거시 `entities/contract`에서만 사용)

### `shared/config/env.ts`
- `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_ANTHROPIC_KEY`, `EXPO_PUBLIC_APP_ENV`. `process.env` 직접 참조 금지. `assertEnv()` 경고.

### `shared/lib/`
| 파일 | 핵심 |
|---|---|
| `utils.ts` | `cn`, `formatCurrency`, `clamp`, `uid` |
| `format-date.ts` | `formatDate`/`formatTime`/`formatDateTime`/`formatKoreanDate`/`diffMinutes`/`formatDuration`/`parseIso` |
| `wage-calculator.ts` | 최저시급은 `minimum-wage-store`에서 주입(2026년 10,320원), `calcDailyWage`, `calcWeeklyHolidayAllowance`, `DailyShift`/`WageBreakdown` 타입. 8시간 초과 1.5배, 야간(22~6시) 0.5배 가산, 주 15h 이상 주휴수당. |

### `shared/ui/` (Toss 톤으로 재구성됨)
| 파일 | 현재 상태 |
|---|---|
| `tokens.ts` | **Toss 디자인 토큰**. `colors`(primary `#3182F6`, primaryDark `#1B64DA`, primaryLight `#E8F2FF`, success/warning/danger 계열 + bg `#F2F4F6`/surface/border/borderStrong/text 4단계), `spacing` xs~xxxl, `radius` sm/md/lg/xl/full, `typography` display/title1~3/body1~2/label/caption, `cardStyles` default/flat/highlighted. |
| `Button.tsx` | **토큰 기반 인라인**. variant: primary/secondary/danger/outline/ghost (기존 5종 시그니처 호환 유지). size: sm/md/lg. props: `children`, `isLoading`, `isDisabled`, `fullWidth`, `onPress`, `style`. |
| `Card.tsx` | **토큰 기반**. variant: default/flat/highlighted. `className` prop도 유지(레거시 NativeWind 호출 호환). |
| `ScreenHeader.tsx` | 토큰 기반 인라인. `useSafeAreaInsets` + `StatusBar.currentHeight` 흡수. **Ionicons `shield-checkmark`** 로고(28×28 파란 사각형) + "알바지킴이". `showLogo` / `title` 옵션. |
| `Toast.tsx` | **신규** — `Animated` 기반 slide-down + fade-in. type: success/error/info. props: `visible`, `message`, `type?`, `onHide?`, `durationMs=2500`. `position: absolute; top: 12; left/right: 16; zIndex: 999`. |
| `Badge.tsx` | NativeWind. tone: danger/caution/info/success. (`badge-*` tailwind 토큰 사용) |
| `Input.tsx` | NativeWind. label/error/multiline/keyboardType. |
| `index.ts` | 위 컴포넌트들 + `export * from "./tokens"` |

## A.5 `src/entities/` — 도메인 최소 단위

### A.5.1 `entities/job-post` ⭐
Public API(`index.ts`): types + mock + api 모두 re-export. `HighlightedContractText`, `IssueDetailSheet` UI 포함.

| 항목 | 내용 |
|---|---|
| `JobPostAnalysisResult` | `workplaceName, hourlyWage, workHours, hasWeeklyHolidayPay, businessStatus("정상"\|"폐업"\|"확인불가"), wageDelinquencyCount, minimumWage2026, issues: JobPostIssue[]` |
| `JobPostIssue` | `{ level: "danger"\|"warning"\|"info", title, description }` |
| `ContractAnalysisResult` | `workplaceName, contractPeriod:{start,end}, hourlyWage, estimatedMonthlyWage, fullText, textSegments: ContractTextSegment[], issues: ContractIssue[]` |
| `ContractIssue` | `id, number, level, title, description, originalText, legalBasis:{law,description}, recommendation, actionable?:{type,label}` |
| `analyzeJobPost(uri)` / `analyzeContract(uri)` | **`USE_MOCK = true`** 토글. true=2초 setTimeout + mock 반환. false=`apiClient.post('/analyze/job-post'\|'/analyze/contract', formData)` + mapper. |
| `MOCK_JOB_ANALYSIS` | "OO카페 강남점" 시급 10,000원(최저 미달), 체불 2건, 주휴 미언급, danger/warning/info 혼합 issues. |
| `mapApiResponseToContractResult` | snake_case → camelCase 변환. |

### A.5.2 `entities/contract` (레거시)
- `ContractAnalysis`, `ContractIssue`, `IssueSeverity = "danger" | "caution" | "info"` ← warning 대신 **caution** (신규와 어휘 다름).
- `api/analyze-contract.ts`: `claudeClient.post('/messages')` 직접 호출 (Claude Opus). 새 코드에서 호출 금지.

### A.5.3 `entities/workplace`
- `Workplace` (`status: contract-pending|contract-analyzed|bssid-pending|registered`, `bssid`, `contractId`, optional `schedule`/`registeredAt`).
- `WorkplaceSchedule { weeklySchedule: Record<number, {start,end}|null> }` (요일별).
- `api/fetch-workplaces.ts`: `fetchWorkplaces`/`fetchWorkplace`/`createWorkplace` (`/part-time-jobs` 엔드포인트).
- `ui/WorkplaceCard.tsx`: status별 Badge 색상.

### A.5.4 `entities/attendance`
- `AttendanceRecord`: `{ id, workplaceId, workplaceName, date, scheduledStart, scheduledEnd, actualCheckIn?, actualCheckOut?, extendedMinutes, workedMinutes, overtimeMinutes, nightWorkedMinutes, estimatedWage, status }`
- `AttendanceStatus = "scheduled" | "checked-in" | "working" | "checked-out"`
- `AttendanceStats { weeklyWorkedHours, weeklyWage, weeklyWorkDays, weeklyTargetHours }`
- `mock-data.ts`: `MOCK_RECENT_ATTENDANCES`(4건, workplaceId="wp-1"), `MOCK_STATS`(32.5h/₩325k/4일/40h), `MOCK_ACTIVE_SESSION`(워크플레이스ID="wp-1", workedMinutes=327, status="working").
- `model/store.ts`: **`useAttendanceStore`** — dev 시뮬레이션용. state: `workState: "before-work"|"working"|"after-work"`, `activeSession`, `recentAttendances`, `stats`. actions: `simulateCheckIn` / `simulateCheckOut` / `simulateReset` / `tickWorkedMinutes`.
- `api/fetch-attendances.ts`: 백엔드 `/working/*` 호출 (현재 미사용).

### A.5.5 `entities/user`
- `User { id, role, isResolutionVerified, ... }`, `UserRole = "mentee"|"mentor"|"admin"`.
- `useAuthStore`: `{ token, userId, name, email, setAuth, clearAuth }`. **axios 인터셉터가 `require()`로 동적 읽음** (순환 import 회피).
- `api/fetch-me.ts`: `/auth/me`.

### A.5.6 `entities/mentor`
- `MentorProfile` (industries, resolvedCases, rating, consultingFee, similarity?), `EscrowOrder`, `EscrowStatus`.
- API: `fetchRecommendedMentors`/`fetchMentor`/`createEscrowOrder`. 현재 view 연결 없음.

### A.5.7 `entities/report` (**레거시 + 신규 공존**)
신규 코치 흐름 모델이 ReportCase. 레거시 `Report`/`ReportEvidence` 인터페이스는 `api/create-report.ts`와의 호환을 위해 유지 (status union이 `Report.status`에 인라인됨 — standalone `ReportStatus`는 새 모델 차지).

| 타입 | 정의 |
|---|---|
| `ReportStatus` (**5-val**, docs/REPORT_SPEC.md 모델) | `"pending"\|"inspecting"\|"correction_ordered"\|"resolved"\|"unresolved"` — 배지는 `pending`/`inspecting`이 같은 "🔵 진행 중", `correction_ordered`="🟡 시정지시 완료", `resolved`="✅ 해결됨", `unresolved`="🔴 미수령" |
| `ReportStepStatus` | `"completed"\|"in-progress"\|"pending"` |
| `ReportStep` | `{ id, title, description, status, actionLabel?, completedAt? }` |
| `ReportEvidenceCount` | `{ attendanceDays, contractDocs, chatLogs, photos }` |
| `ReportSolidarity` | `{ isJoined: boolean, participantCount: number }` |
| `ReportCase` | `{ id, workplaceId, workplaceName, status: ReportStatus, startedAt, estimatedUnpaidAmount, evidence: ReportEvidenceCount, steps: ReportStep[], currentStepIndex, progressPercent, solidarity?, draftReportPdfUrl?, submittedAt?, officialCaseNumber? }` |
| `createInitialReportSteps()` | 6단계 시작 상태 반환 (step-1 in-progress, 나머지 pending). |
| `Report` (레거시) | `{ id, workplaceId, workplaceName, estimatedUnpaidAmount, status:"draft"\|"submitted"\|"resolved"(인라인), evidences: ReportEvidence[], isSolidarity, participantCount, createdAt }` — `api/create-report.ts`가 사용. |
| `api/create-report.ts` | `fetchReports`/`fetchReport`/`createReport`/`generateReportDraft` — 백엔드 `/reports` 엔드포인트. **새 코드는 호출하지 말 것**. |

## A.6 `src/features/` — 단일 인터랙션

### A.6.1 `features/favorite-workplace` ⭐
`useFavoriteWorkplaceStore`(`FavoriteWorkplace` 타입 정의 여기에 — 신규는 이걸 import).
```ts
FavoriteWorkplace = {
  id: string,                                // Date.now().toString()
  name: string,
  createdAt: string,                          // ISO
  contractStatus: "none" | "uploaded",
  registrationStatus: "none" | "registered",
  bssid?, ssid?, registeredAt?,
  contractImageUri?: string,                  // 계약서 사진 local URI (신규)
  contractAnalysis?: ContractAnalysisResult,  // 마지막 분석 결과 (신규)
}
```
Actions:
- `addWorkplace(name)` — 빈 카드 생성
- `removeWorkplace(id)`
- `markContractUploaded(id, imageUri, analysis)` — **3-인자** (imageUri + analysis 함께 저장, contractStatus="uploaded")
- `updateContractAnalysis(id, analysis)` — 텍스트 편집 등 부분 수정
- `markRegistered(id, bssid, ssid)` — BSSID 등록 완료

영속화 없음(메모리). 앱 재시작 시 초기화.

### A.6.2 `features/contract-upload` (**store 신규 / form ui 레거시**)
- `model/store.ts` — **`useContractUploadStore`** (전면 교체됨):
  ```ts
  state: { files: UploadedFile[], isAnalyzing: boolean }
  UploadedFile = { id, uri, name }
  actions: addFile, removeFile, clearFiles, setAnalyzing
  ```
  - `clearFiles()`는 ContractUploadView의 `handleAnalyze` 성공 분기 1곳에서만 호출 → 분석 미완료 상태로 뒤로가기 시 파일 보존.
- `ui/ContractUploadForm.tsx` (레거시, 어디서도 import 안 됨).

### A.6.3 `features/report-submit` ⭐ (**store 전면 교체됨**)
- `model/store.ts` — **`useReportStore`**:
  ```ts
  state: { cases: ReportCase[] }
  actions:
    startReport({ workplaceId, workplaceName, estimatedUnpaidAmount, attendanceDays, contractDocs }) => caseId
    advanceStep(caseId)            // currentStepIndex+1, steps[i].status 재계산, progressPercent 갱신
    setStatus(caseId, status)
    setDraftPdfUrl(caseId, url)
    toggleSolidarity(caseId)       // isJoined toggle, participantCount ±2
    closeCase(caseId)              // status="closed"
    deleteCase(caseId)
  ```
- `ui/ReportSubmitForm.tsx` (레거시, 호출처 없음).
- `index.ts`: `useReportStore`만 re-export.

### A.6.4 `features/bssid-scan` (Android 전용)
- `lib/wifi-scanner.ts`: 실제 스캐너 (react-native-wifi-reborn 동적 import, Expo Go 크래시 회피). `WifiNetwork = { ssid, bssid, level, isRecommended? }`. `getCurrentBssid()`도 export.
- `lib/use-bssid-scan.ts`: 오케스트레이터 — **`USE_MOCK = true`** 토글. mock일 때 4개 더미 네트워크 1.2초 지연. `scanWifiNetworks()` export.
- `model/store.ts` — `useBssidScanStore`:
  ```ts
  state: { isScanning, networks: WifiNetwork[], selectedBssid: string|null, error: string|null }
  actions: setScanning, setNetworks(자동 정렬 + 1위에 isRecommended=true), selectNetwork(bssid), setError, reset
  ```
- `ui/BssidScanList.tsx`: FlatList, dBm → ●○ 표시.
- 실제 동작은 `eas build --profile development` APK에서만.

### A.6.5 `features/check-in`, `check-out`, `overtime` (스켈레톤)
- `CheckInModal`(파란 헤더), `CheckOutModal`(주황 헤더 + 연장근무 버튼) — 현재 view에서 호출 안 됨.
- 각 store: `isSubmitting`/`error`/`checkedInAt`(또는 `checkedOutAt`). check-out store는 `isWifiConnected`, `isBssidMatched`도 보유.
- overtime: `OvertimeForm` (30분/1h/1.5h/2h 빠른 선택).

### A.6.6 `features/mentor-match`, `features/solidarity` (스켈레톤)
- `MentorCard`, `EscrowCheckout`, `SolidarityStatus`, `SolidarityGroup`/`SolidarityParticipant` 타입 — 현재 view 미연결.

### A.6.7 `features/job-verify` (레거시)
- 옛 분석 흐름 전체. HomeView는 이제 `entities/job-post` 사용 — 여기는 호출되지 않음. 삭제 가능 후보지만 보존 중.

## A.7 `src/widgets/` — 전부 스켈레톤/레거시

| 슬라이스 | 상태 |
|---|---|
| `widgets/job-verify` | 레거시 — HomeView에서 import 안 함. |
| `widgets/contract-analysis/ContractAnalysisResult` | 스켈레톤. |
| `widgets/attendance-card/AttendanceCard` | 스켈레톤. |
| `widgets/dashboard/WorkDashboard` | 스켈레톤. |
| `widgets/report-form/ReportForm` | 스켈레톤. |

새 기능을 widgets에 둘 필요는 거의 없음 — 대부분 view 또는 feature로 직행.

## A.8 `src/views/` — 화면 조립

### A.8.1 `views/home` ⭐
- `HomeView.tsx`: NativeWind 위주 + 인라인 혼용. state: `selectedImage`/`analysisResult`/`isAnalyzing`/`showResult`. `pickFromCamera`/`pickFromLibrary` 직접 사용. `handleAnalyze` → `analyzeJobPost(uri)`. showResult=true이면 **`JobAnalysisResultView`를 절대위치 오버레이**로 렌더.
- `JobAnalysisResultView.tsx`: 인라인 style + Ionicons.
  - `useFavoriteWorkplaceStore` 직접 접근 — 별 toggle 자체 구현 (add ↔ remove). 별 색: `#94A3B8` outline / `#2563EB` filled.
  - `result.issues.map(...)` 동적 렌더 (`LEVEL_COLOR` 맵).
  - 위험 배너(danger 건수) → 업장정보 4-cell(시급/근무시간/주휴/사업자) → issues 목록 → 체불이력 카드 → 하단 고정 "관심업장으로 등록" / 등록되면 "관심업장 보러가기 →" 분기.
  - **`<Toast visible={isRegistered} message="관심업장으로 등록되었습니다" type="success" />`** — slide-down + fade-in 자동.
  - `onFavoriteAdded` prop은 호환을 위해 `_onFavoriteAdded`로 보존(미사용).

### A.8.2 `views/workplace` ⭐
- `WorkplaceView.tsx`: 단일 컴포넌트에서 **6가지 화면 분기** — `currentScreen: "list" | "upload" | "analysis" | "edit" | "bssid-register" | "register-complete"`.
  - 카드 버튼 시스템: `BUTTON_STYLES` (`disabled`/`primary`/`outline`/`success`) + `getCardButtonStates(workplace)` 헬퍼로 진행 단계별 시각 상태 결정.
    - initial: 계약서 = primary(꽉 찬 파랑), 등록 = disabled(회색)
    - contract-uploaded: 계약서 = outline("계약서 수정"), 등록 = primary
    - registered: 계약서 = outline, 등록 = success("등록 완료 ✓", 비활성)
  - 계약서 수정 흐름: contractStatus="uploaded"면 `ContractEditView`로, 아니면 `ContractUploadView`로 라우팅.
  - 분석 완료 → `markContractUploaded(id, imageUri, result)` 호출 (3-인자).
- `ContractUploadView.tsx` (**전면 재작성됨**):
  - `useContractUploadStore` 기반 다중 파일.
  - 실제 `expo-image-picker` 권한 요청 + `launchCameraAsync` / `launchImageLibraryAsync(allowsMultipleSelection)`.
  - 촬영 팁 박스 **제거됨**. dropzone + 카메라/갤러리 버튼 + 파일 리스트(각 행 X 삭제) + "🔒 개인정보 보호" 안내.
  - "분석 시작하기 (N장)" → 반투명 검은 오버레이 + `ActivityIndicator` + "AI가 계약서를 분석하고 있어요" → 성공 시 `clearFiles()` + `onAnalysisComplete(imageUri, result)`.
- `ContractAnalysisView.tsx`: 초록 요약 카드 + tabs (`contract`/`issues`/`guide`, issues만 구현) + `HighlightedContractText` + `IssueDetailSheet` + 하단 "관심업장 등록" 버튼.
- `ContractEditView.tsx` (**신규**): "계약서 수정" 전용. mode: `"menu" | "edit-text"`.
  - menu: 이전 사진 + 이슈 N건 요약 + 3가지 옵션 카드 (사진 다시 찍기 / 텍스트 직접 수정 / 분석 결과 다시 보기).
  - edit-text: TextInput multiline + `updateContractAnalysis` 호출.
- `BssidRegisterView.tsx`: 헤더 + "주변 Wi-Fi 네트워크" → **접힌 "Wi-Fi BSSID란?" 토글** (showInfo state) → 네트워크 리스트. 신호 강도별 색상(`#1D4ED8`/`#F97316`/`#94A3B8`) + 추천 배지(`#DBEAFE`/`#1E40AF`).
- `BssidRegisterCompleteView.tsx`: 파란 성공 카드 + BSSID 정보 행(네트워크 / BSSID 2행만, 30분 행 제거됨) + "근무 기록 작동 방식" 3단계 (지오펜싱/30분 모니터링 표현 모두 제거) + 주의사항 3줄 + 하단 "근무 대시보드로 이동 →" / "홈으로".

### A.8.3 `views/work-record` ⭐
- `WorkRecordView.tsx`: state `currentScreen: "list" | "dashboard"`. **`useFocusEffect`로 탭 포커스 시 list 강제 리셋** (탭 재진입 시 dashboard에 머무는 버그 수정). 토큰 적용(`colors.bg`/`typography.title1` 등). 등록 완료된 workplaces만 필터링.
- `WorkDashboardView.tsx`: 핵심 흐름 — 훅 호출이 모두 컴포넌트 최상단(이전 "Rendered fewer hooks" 버그 수정됨).
  - state: `showCalendar`. selectors: `useFavoriteWorkplaceStore`(name), `useAttendanceStore`(workState/activeSession/stats/recentAttendances), `useReportStore`(cases).
  - `useEffect`로 working 상태에서 60초마다 `tickWorkedMinutes` (자동 증분).
  - 화면 분기: showCalendar=true → `WorkCalendarView` 렌더.
  - 메인 UI: 근무 중 LIVE 카드(파랑 채움) ↔ 오프라인 카드 / 통계 3-grid / 최근 근무 기록 + "근무 기록 달력 보기" / **신고 카드(빨강)** — active 신고 없으면 "🚨 임금체불·위법 신고하기" 누름 시 `startReport(...)` 호출 후 `router.push("/(tabs)/report")`, active 신고 있으면 "진행 중인 신고 보기 →" / 하단 **DEV 패널** (`__DEV__`일 때만, 출근/퇴근/리셋 3버튼).
- `WorkCalendarView.tsx`: 자체 구현 월간 캘린더. `getMonthMatrix(year, month)` + `useMemo`로 attendanceMap. 월 ◀ ▶ 네비, 근무일은 파란 점 표시, 날짜 누름 → 하단 상세 카드(출근/퇴근 시각, 근무 시간, 일급).

### A.8.4 `views/report` ⭐ (신고 코치 흐름 + 후기 + 멘토 + 공동대응 통합)

모든 신고 관련 화면은 `src/views/report/ui/` 아래에 위치한다 (FSD 컨벤션). `useReportStore.cases !== resolved` 필터로 활성 사건을 표시하고, ReportListView/ReportDetailView가 라우터처럼 내부 화면 전환을 관리한다.

#### ReportView (`ReportView.tsx`)
- 훅 최상단 + `useFocusEffect`로 list 리셋
- `activeCases = cases.filter(c => c.status !== "resolved")`
- length=0 → `ReportEmptyView`, 아니면 `ReportListView`. detail 분기는 `selectedCaseId`로 `ReportDetailView`

#### ReportEmptyView (`ReportEmptyView.tsx`)
- 진행 중인 사건이 없을 때 표시
- "신고 가능한 내 업장 보기" → `/(tabs)/work-record` 이동

#### ReportListView (`ReportListView.tsx`)
3섹션 구성 + 내부 상태로 review 화면 overlay 관리:
- 섹션 1 진행 중인 사건 (카드 + "사건 상세 보기 →" + "[+ 새 사건 신고하기]")
- 섹션 2 해결 후기 (필터칩 전체/같은 업종/같은 지역 + ReviewPreviewCard 최대 2개 + "더 보기 >")
- 섹션 3 내 후기 쓰기 (`cases.some(c => c.status === "resolved")` 일 때만)
- state: `showReviewList`/`showReviewWrite`/`viewingReviewId` 분기

#### ReportDetailView (`ReportDetailView.tsx`)
훅 호출 후 `reportCase === undefined`면 `null` 반환. 풀스크린 overlay 4종 분기: `showGroupJoin` / `showMentorRecommend` / `showDraftWizard` / `showResolveConfirm`. 메인 구성:
- 헤더: workplaceName + `STATUS_BADGE[status]` (🔵/🟡/✅/🔴)
- 미지급 금액 + "N/M 단계" 진행률 카드
- 공동대응 GroupAlertBanner (`useGroupStore.findGroupByWorkplace`로 결정, 닫기 가능)
- "지금 해야 할 일" 카드 — `getCurrentTaskByStep(currentStep)` 6-way 분기 (멘토 진입점 포함)
- 자동 수집 증거 6행 (`+ 추가` 버튼) + 💡 안내
- 진행 단계 6-step 체크리스트 (`STEP_ORDER` 순회 + `STEP_META`)
  - `group_decision` 활성: 인라인 그룹 위젯
  - `complaint_draft`/`investigation` 활성: 인라인 멘토 진입 버튼
- 공동대응 그룹 본문 섹션 (peer 케이스 기반)
- 사건 해결 확인 진입점 카드 (`status === "inspecting" || "correction_ordered"`)
- 멘토 연결하기 풍부 카드
- 신고 취하

#### GroupJoinView (`GroupJoinView.tsx`)
- 진입: GroupAlertBanner [공동대응 참여하기], 본문 공동대응 그룹 버튼, 진행 단계 group_decision 인라인, "지금 해야 할 일" group_decision primary
- 그룹 현황 (총 피해액, 참여자 N명, 상태 배지) + 멤버 목록 (👑 대표자/🙋 자원 배지)
- `electing` 상태 시 대표자 선출 안내 카드 + [내가 대표자 할게요]/[멤버로만 참여할게요]
- 그룹 채팅 진입점 (Phase B — Alert "준비 중")
- store: `useGroupStore` (`findGroupByWorkplace`/`joinGroup`/`volunteerAsLeader`) + `useAuthStore` (`userIdString`/`nickname`)
- 자원자 충돌 시: "이미 {nickname}님이 자원하셨어요" 확인 분기

#### MentorRecommendView (`MentorRecommendView.tsx`)
- 진입: 진행 단계 `complaint_draft`/`investigation` 인라인, "지금 해야 할 일" secondary, 하단 멘토 카드
- props: `caseId`/`industry`/`damageTypes` — ReportDetailView가 `reportCase`에서 직접 전달
- 면책 배너 항상 표시(닫기 불가) + 매칭 사유 + top-3 멘토 카드
- 매칭 이유 태그: 같은 업종 경험 / 같은 피해 유형 / 공동대응 대표 / 빠른 해결
- 결제: Modal로 분배 표시 → `usePaymentStore.chargeMentorFee({ menteeId, mentorId, caseId })` → 1.5s mock 로딩 → 매칭 완료 화면 → [확인] → onBack
- store: `useMentorStore.getRecommended` + `usePaymentStore.chargeMentorFee` + `useAuthStore.userIdString`

#### ReportDraftWizardView (`ReportDraftWizardView.tsx`)
- 진입: "지금 해야 할 일" complaint_draft primary [진정서 작성 시작 →]
- 5-step 마법사: 피해 유형(다중) → 피해 기간(`DateTimePicker` 시작/종료 분리) → 미지급 금액(자동 분배 60/20/15/5 + 수동 수정 토글) → 협의 시도 여부 → 진정서 미리보기
- step indicator 상단 고정
- 미리보기에서 [PDF로 저장]/[공유하기]/[고용24 바로가기]
- PDF: `Print.printToFileAsync(html)` → `Sharing.shareAsync(uri)` (생성 중 오버레이 표시)
- HTML 템플릿: `features/report-submit/lib/buildComplaintHtml(draft, reportCase)` — `ReportDraft` 타입 사용

#### ReviewListView (`ReviewListView.tsx`)
- 진입: ReportListView "더 보기 >"
- 업종/지역 2-row 필터칩
- 카드 탭 → 내부 `selectedId` state → ReviewDetailView 풀스크린 overlay
- store: `useReviewStore.reviews` + `markHelpful`

#### ReviewDetailView (`ReviewDetailView.tsx`)
- 메타 헤더 + 사건 요약 + 해결 타임라인 (진정→배정→출석조사→시정→해결)
- 노하우 3섹션 (작성 시 입력된 것만 표시): 진정서 / 출석조사 / 사업주 협상
- 자유 서술
- "도움됐어요" 카운트 (`markHelpful`)
- `isMentor=true`일 때만 [이 분과 1:1 멘토 매칭하기 · ₩10,000] 버튼

#### ReviewWriteView (`ReviewWriteView.tsx`)
- 진입: ReportListView 섹션 3 [후기 쓰기 →], `cases.some(c => c.status === "resolved")` 시에만 보임
- 자동 입력: 닉네임 (`useAuthStore.nickname`), 업종/지역/피해유형 (`resolvedCase.{industry,region,damageTypes[0]}`), 해결기간 (`calcResolveDays`)
- 폼: 별점 1~5 + 제목(max 30) + 노하우 3-field + 자유 서술(max 500)
- 멘토 등록 체크박스 → 등록 시 `useMentorStore.addMentor(MentorProfile)` 생성
  - `wasGroupLeader`: `useGroupStore.groups.some(g => g.leaderId === userId)` 자동 판정
  - `score`: `calcMentorScore` 사용
  - `mentorUserId`: `useAuthStore.userIdString`
- 부수효과: `useReviewStore.addReview` + (조건부) `useMentorStore.addMentor`

#### ResolveConfirmView (`ResolveConfirmView.tsx`)
- 진입: ReportDetailView 본문의 "임금을 받으셨나요?" 카드 (`status === "inspecting" || "correction_ordered"`)
- "임금을 실제로 받으셨나요?" 안내 + ✓ 네 받았어요 / ⚠ 아직 못 받았어요
- ✓ 분기: `updateCaseStatus(id, "resolved")` → `resolvedAt` 자동 채움 → `usePaymentStore.records`에서 `caseId === case.id && status === "paid"` 찾기 → `refundAfterResolved(payment.id)` → ₩3,000 환급 Alert
- ⚠ 분기: `updateCaseStatus(id, "unresolved")` → 민사소송/대지급금/법률구조공단 안내 Alert
- 환급 안내 카드 항상 표시

#### UnresolvedGuideView (TODO — 미구현)
- 현재는 ResolveConfirmView에서 Alert 안내문으로 대체
- 향후 별도 화면으로 분리: 체불 임금등·사업주 확인서 발급 / 대한법률구조공단 (평균임금 400만원 미만 무료) / 대지급금 제도

### A.8.5 `views/my` (스켈레톤)
- `MyView.tsx`: NativeWind, 빈 화면 + 제목만.

## A.9 알려진 주의사항 / 함정

1. **두 개의 분석 흐름**: 신규 `entities/job-post` vs 레거시 `entities/contract` + `features/job-verify` + `widgets/job-verify`. 새 기능은 무조건 신규.
2. **`FavoriteWorkplace` 타입 중복**: `entities/job-post/model/types.ts`(참고용)와 `features/favorite-workplace/model/store.ts`(실제 사용)에 둘 다 존재 — 필드 다름. **항상 `@/features/favorite-workplace` 쪽 import.**
3. **`IssueSeverity` 어휘 차이**: `entities/contract` `"caution"` vs `entities/job-post` `"warning"`. 호환 안 됨.
4. **`ReportStatus` 의미 분기**: 새 `ReportStatus`(5-val, ReportCase용 — `pending`/`inspecting`/`correction_ordered`/`resolved`/`unresolved`) vs 레거시 `Report.status`(3-val, `Report.status` 필드에 인라인). standalone `ReportStatus` export는 **새 모델 차지**. 신고 취하(`closeCase`)는 현재 `unresolved`로 매핑되어 있는데 의미상 별도 "withdrawn"이 더 정확 — 다음 STEP에서 `deleteCase`로 분리 고려 가능.
5. **TypeScript strict (noUnusedLocals, noUnusedParameters)**: 미사용 props/local에 `_` 접두 필수 (`_workplaceId`, `_workplaceName`, `_onFavoriteAdded`). 새 STEP에서 타입/맵 선언 → 같은 STEP 안에서 소비하지 않으면 게이트 통과 못 함 — 묶어 진행.
6. **NativeWind ↔ 인라인 style 혼재**:
   - **인라인 + tokens**: 신규 view 대부분 (Toss 톤)
   - **NativeWind**: HomeView, MyView, ReportSubmitForm, ContractUploadForm, Badge, Input, 레거시 위젯
   - 새 파일은 주변 컨벤션 따를 것. tokens는 인라인 화면에서만 활용.
7. **`USE_MOCK` 토글 2곳**:
   - `entities/job-post/api/analyze-job-post.ts`
   - `features/bssid-scan/lib/use-bssid-scan.ts`
   백엔드 붙일 때 false로.
8. **로그인 토큰 영속화 미구현**: `useAuthStore` 메모리만. AsyncStorage 추가 필요.
9. **axios 인터셉터 순환 import trick**: `apiClient` 안에서 `auth-store`를 `require()`로 동적 호출. 정적 import로 변경 금지.
10. **아이콘 라이브러리 혼재**: `@expo/vector-icons` (Ionicons) 위주, 일부 옛 view는 `lucide-react-native`. 신규는 Ionicons.
11. **BSSID 실 동작**: Expo Go 불가 — `eas build --profile development` APK 필요.
12. **훅 호출 순서**: 모든 view에서 `useState`/`zustand selectors`/`useEffect`/`useCallback`은 컴포넌트 함수 최상단에 모두 모이도록. 조건부 `return ...`은 모든 훅 호출 뒤. (과거 WorkDashboardView에서 early return이 추가 selector 앞에 있어 "Rendered fewer hooks" 에러 발생 → 수정 완료. 새 view에서도 같은 패턴 유지.)
13. **탭 재진입 시 list 복귀**: 내부 화면 전환을 쓰는 view(`WorkRecordView`, `ReportView`)는 반드시 `useFocusEffect`로 list 리셋. 안 그러면 다른 탭 갔다 돌아왔을 때 옛 상태 유지.
14. **앱 권한 (app.json 현재 상태)**:
    - Android: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`, `ACCESS_NETWORK_STATE`, `CAMERA`, `READ_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`
    - iOS infoPlist: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`

## A.10 작업 시 의사결정 가이드

> "어디에 코드를 둘까?"

| 추가하려는 코드 | 위치 |
|---|---|
| 도메인 타입 (Workplace, JobPost, Report, Attendance 등) | `entities/<domain>/model/types.ts` |
| 서버/외부 호출 함수 | `entities/<domain>/api/*.ts` |
| 표현 전용 컴포넌트 (한 도메인 객체 표시) | `entities/<domain>/ui/*.tsx` |
| Mock 데이터 | `entities/<domain>/model/mock-data.ts` |
| 사용자 한 동작의 상태/오케스트레이션 (store 포함) | `features/<action>/{model,ui,lib,api}` |
| 도메인 간 조합 블록 | `widgets/<name>/ui/*.tsx` (단, 신규는 거의 view로 직행 권장) |
| 라우트 화면 조립 + 내부 화면 전환 | `views/<route>/ui/*.tsx` |
| 도메인 무관 유틸/상수 | `shared/lib/*.ts` |
| 모든 화면이 공유하는 컴포넌트 | `shared/ui/*.tsx` |
| 디자인 토큰 (색상/spacing/typography) | `shared/ui/tokens.ts` |

> "Public API에 뭘 넣을까?" — 외부 슬라이스가 import해야 하는 것만 `index.ts`에 export. 내부 helper는 export 금지.

> "신규 분석 흐름 vs 레거시 흐름?" — 신규: `entities/job-post` + `features/favorite-workplace` + `views/home/JobAnalysisResultView` + `views/workplace/*View`. 레거시 슬라이스(entities/contract, features/job-verify, widgets/*, features/report-submit/ui/ReportSubmitForm, features/contract-upload/ui/ContractUploadForm)는 **건드리지 않고 보존**.

> "백엔드 연결?" — `USE_MOCK` 토글 false + `mapApiResponseTo*` 매퍼 검증. 새 store는 모두 메모리 — 영속화/서버 동기화는 별도 작업.

## A.11 미래 스펙 (참고)

> 부록 A는 **현재 코드 상태** 스냅샷이다. **미래 구현 의도**는 별도 문서에 있다.

| 주제 | 위치 |
|---|---|
| 임금체불 신고 전체 흐름 (공동대응 그룹 / 멘토 매칭 / 결제 / 후기 시스템 / 4탭 구조 / 법적 면책) | [`docs/REPORT_SPEC.md`](./docs/REPORT_SPEC.md) |

새 신고 관련 작업을 시작하기 전에는 이 문서를 먼저 읽고 현재 코드(A.5.7/A.6.3/A.8.4)와의 차이를 확인할 것. 특히 `ReportStatus`의 6-val ↔ 5-val 차이, `ReportSolidarity` ↔ `Group/GroupMember` 차이는 작업 첫 STEP에서 결정해야 함.
