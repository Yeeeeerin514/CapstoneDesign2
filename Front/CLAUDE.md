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
