# 📘 알바지킴이 백엔드 API 명세서

> 추가 개발자를 위한 전체 백엔드 API 레퍼런스.
> 실제 컨트롤러 코드 기반으로 작성됨.
>
> **마지막 업데이트**: 2026-05-29
> **브랜치 기준**: `main` (커밋 `4ab8c18b` 이후)

---

## 0. 기본 정보

| 항목 | 값 |
|---|---|
| **Base URL (운영)** | `http://13.124.178.60:8080` |
| **Base URL (로컬)** | `http://localhost:8080` |
| **포트** | 8080 |
| **인증 방식** | JWT (`Authorization: Bearer {token}`) |
| **JWT 만료** | 24시간 (86,400,000ms) |
| **CORS 허용** | `http://localhost:3000,5173,8081,19006`, `http://13.124.178.60:8080`, `exp://192.168.0.0:19000` |

### 인증 불필요 경로 (SecurityConfig `permitAll`)
- `/api/auth/**`
- `/api/health`
- `/api/admin/**`
- `/api/job-postings/**`
- `/api/contracts/**`
- `/api/dev/**`

그 외 모든 엔드포인트는 JWT 필수.

---

## 1. 🔐 인증 API (`/api/auth`)

### `POST /api/auth/signup` — 회원가입
- **인증**: 불필요
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "********",
    "name": "홍길동",
    "phoneNumber": "01012345678"
  }
  ```
- **Response 201 Created**:
  ```json
  {
    "token": "eyJhbGc...",
    "userId": 1,
    "name": "홍길동",
    "email": "user@example.com"
  }
  ```

### `POST /api/auth/login` — 로그인
- **인증**: 불필요
- **Request Body**: `{ "email", "password" }`
- **Response 200**: 위 회원가입 응답과 동일 구조

### `GET /api/auth/me` — 내 정보 조회
- **인증**: 필요
- **Response 200**: `{ "token", "userId", "name", "email" }`

### `PUT /api/auth/fcm-token` — FCM 토큰 갱신
- **인증**: 필요
- **Request Body**: `{ "fcmToken": "..." }`
- **Response 204**

---

## 2. 📄 계약서 분석 API (`/api/contracts`)

### `POST /api/contracts/analyze` — 계약서 이미지 분석
- **인증**: 필요
- **Content-Type**: `multipart/form-data`
- **Form fields**:
  - `image` (File, required): 계약서 이미지
  - `partTimeJobId` (Long, optional): 연결할 알바 ID
- **Response 201 Created**: 아래 구조

```json
{
  "contractId": 1,
  "hasViolation": true,
  "extractedInfo": {
    "hourlyWage": 12000, "monthlyWage": 2000000, "dailyWage": null,
    "workingHoursPerDay": 6.0, "workingDaysPerWeek": 5,
    "startDate": "2020년 3월 5일",
    "workPlace": "본사 마케팅팀",
    "jobDescription": "영업 및 마케팅 관리",
    "weeklyHolidayAllowanceMentioned": true,
    "overtimeAllowanceMentioned": false,
    "annualLeaveMentioned": true,
    "breakTimeMentioned": true,
    "employerName": "○○물산",
    "businessRegistrationNumber": "1234567890",
    "workDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    "workStartTime": "09:00",
    "workEndTime": "16:00",
    "employmentStartDate": "2020-03-05",
    "contractEndDate": "2021-03-04",
    "wagePaymentDate": "매월 5일",
    "wagePaymentMethod": "계좌이체",
    "breakStartTime": "12:00",
    "breakEndTime": "13:00",
    "employerAddress": "서울시 중구 ○○대로 ○○○",
    "employerPhone": "021234567",
    "employerRepresentative": "남경음"
  },
  "violations": [
    {
      "type": "OVERTIME_PAY",
      "severity": "MEDIUM",
      "description": "연장수당 조항이 명시되어 있지 않음.",
      "legalBasis": "근로기준법 제56조",
      "legalBasisExcerpt": "근로기준법 제56조(연장 · 야간 및 휴일 근로) — ...",
      "relatedCases": [
        {
          "sourceType": "PRECEDENT",
          "header": "[판례] 대법원 2025.10.16 ...",
          "excerpt": "..."
        }
      ]
    }
  ],
  "summary": "본 계약서는 ... 양호한 편이나 ...",
  "minimumWage": 10030,
  "imageUrl": "https://albasave-storage-new.s3...",
  "factSheet": { /* ContractFactSheet 구조 — 아래 별도 명세 */ },
  "createdAt": "2026-05-29T01:43:55"
}
```

**일관성 보장**: 동일 이미지(SHA-256 해시 일치) 재업로드 시 기존 분석 결과 그대로 반환 (LLM 호출 없음).

### `GET /api/contracts` — 내 계약서 분석 이력
- **인증**: 필요
- **Response**: `List<ContractAnalysisResponse>`

### `GET /api/contracts/{contractId}` — 단건 조회
- **인증**: 필요 + 본인 소유만 (다른 사용자 조회 시 400)
- **Response**: `ContractAnalysisResponse`

### `GET /api/contracts/{contractId}/factsheet` — 진정서용 정형 데이터 (경량)
- **인증**: 필요
- **Response**: `ContractFactSheet`
  ```json
  {
    "businessRegistrationNumber": "1234567890",
    "workDays": ["MONDAY", "TUESDAY", ...],     // List<DayOfWeek>
    "workStartTime": "09:00",                    // LocalTime
    "workEndTime": "16:00",
    "employmentStartDate": "2020-03-05",          // LocalDate
    "hourlyWage": 12000, "minimumWage": 10030,
    "monthlyWage": 2000000,
    "employmentEndDate": "2021-03-04",
    "wagePaymentDate": "매월 5일", "wagePaymentMethod": "계좌이체",
    "breakStartTime": "12:00", "breakEndTime": "13:00",
    "employerName": "○○물산",
    "employerAddress": "...", "employerPhone": "021234567",
    "employerRepresentative": "남경음"
  }
  ```

---

## 3. 💼 알바 관리 API (`/api/part-time-jobs`)

### `POST /api/part-time-jobs` — 알바 등록
- **인증**: 필요
- **Request Body** (`PartTimeJobRequest`):
  ```json
  {
    "businessId": null, "businessName": "OO카페",
    "day": "MONDAY", "startTime": "09:00", "endTime": "18:00",
    "startDay": "2026-01-01", "endDay": null, "hourlyWage": 10500
  }
  ```
- **Response 201**: `PartTimeJobResponse`

### `GET /api/part-time-jobs` — 내 알바 목록
- **인증**: 필요
- **Response**: `List<PartTimeJobResponse>`

### `DELETE /api/part-time-jobs/{id}` — 알바 비활성화
- **인증**: 필요
- **Response 204**

---

## 4. ⏰ 출퇴근 기록 API (`/api/working`)

### `POST /api/working/register-workplace` — 사업장 통합 등록 ⭐
- **인증**: 필요
- **Request Body**:
  ```json
  { "workplaceName": "OO카페", "bssid": "aa:bb:cc:dd:ee:ff", "ssid": "OOcafe_wifi" }
  ```
- **Response 200**:
  ```json
  { "partTimeJobId": 1, "bssid": "...", "workplaceName": "..." }
  ```
- **설명**: PartTimeJob 자동 생성 + BSSID 영속. 프론트의 사업장 등록 흐름이 호출.

### `POST /api/working/bssid/{partTimeJobId}` — BSSID 등록
- **인증**: 불필요 (개선 필요)
- **Request Body** (`BssidRegisterRequest`): `{ "bssid": "..." }`
- **Response 204**

### `POST /api/working/clock-in` — 출근
- **인증**: 불필요 (개선 필요)
- **Request Body** (`ClockInRequest`): `{ "partTimeJobId", "bssid" }`
- **Response 200** (`WorkingResponse`):
  ```json
  {
    "id": 1, "partTimeJobId": 1,
    "realStartTime": "2026-05-29T09:00:00",
    "realEndTime": null, "workingMinutes": null,
    "inProgress": true
  }
  ```

### `POST /api/working/clock-out` — 퇴근
- **인증**: 불필요 (개선 필요)
- **Request Body** (`ClockOutRequest`): `{ "workingId", "bssid" }`
- **Response 200**: `WorkingResponse`

### `GET /api/working/current/{partTimeJobId}` — 현재 출근 중 여부
- **인증**: 불필요
- **Response**: `WorkingResponse` 또는 `null`

### `GET /api/working/history/{partTimeJobId}` — 출퇴근 이력
- **인증**: 불필요
- **Response**: `List<WorkingResponse>`

### `GET /api/working/total-minutes/{partTimeJobId}` — 총 근무 시간
- **인증**: 불필요
- **Response**: `{ "totalMinutes": 4800 }`

---

## 5. 📢 임금체불 신고 API (`/api/reports`)

### `POST /api/reports` — 신고 생성 (임금 자동 계산)
- **인증**: 필요
- **Request Body** (`CreateReportRequest`):
  ```json
  {
    "partTimeJobId": 1,
    "businessRegistrationNumber": "1234567890",
    "businessId": null,
    "businessName": "OO카페",
    "violationType": "WEEKLY_HOLIDAY",
    "description": "주휴수당을 한 번도 받지 못함",
    "hourlyWage": 10030,
    "actualReceivedAmount": 500000,
    "manualUnpaidAmount": null,
    "evidenceImageUrl": null
  }
  ```
- **`violationType` 값**: `"MINIMUM_WAGE" | "WEEKLY_HOLIDAY" | "OVERTIME" | "NIGHT" | "OTHER"`
- **Response 201** (`ReportResponse`):
  ```json
  {
    "id": 1, "businessName": "...", "businessRegistrationNumber": "...",
    "violationType": "WEEKLY_HOLIDAY", "unpaidAmount": 50000,
    "description": "...", "evidenceImageUrl": null,
    "complaintDraft": null, "complaintPdfUrl": null,
    "status": "PENDING", "createdAt": "...",
    "wageBreakdown": {
      "hourlyWage": 10030, "totalWorkMinutes": 2400,
      "totalWorkHours": 40.0, "basePay": 401200,
      "weeklyHolidayPay": 80240, "overtimePay": 0,
      "nightPay": 0, "totalShouldReceive": 481440,
      "minimumWage": 10030
    },
    "collectiveActionCandidates": [],
    "hasCollectiveActionPartners": false
  }
  ```

### `GET /api/reports` — 내 신고 목록
- **인증**: 필요
- **Response**: `List<ReportSummary>`

### `GET /api/reports/{reportId}` — 신고 상세
- **인증**: 필요 + 본인 소유만
- **Response**: `ReportResponse`

### `GET /api/reports/wage-calc?partTimeJobId={id}&hourlyWage={n}` — 임금 계산 시뮬레이션
- **인증**: 필요
- **Query**: `partTimeJobId`, `hourlyWage` (default 0)
- **Response**: `WageBreakdown`

### `POST /api/reports/{reportId}/complaint-draft` — 진정서 초안 생성 (LLM)
- **인증**: 필요
- **Response**: `{ "reportId", "complaintDraft": "...", "submissionUrl": "..." }`

---

## 6. 📋 공고 분석 API (`/api/job-postings`)

### `POST /api/job-postings/analyze` — 공고 이미지 분석
- **인증**: 불필요
- **Content-Type**: `multipart/form-data`
- **Form field**: `image` (File, required)
- **Response 200** (`JobPostingAnalysisResponse`):
  - `analysisId` (Long)
  - `extracted` (ExtractedJobPosting) — 사업자명/시급/근무시간/복지 등 추출
    - `llmConcerns` (List): AI가 찾은 위법 항목 (category, severity, title, description, evidence)
  - `businessCandidates` (List): 인허가 DB 매칭 후보
  - `externalChecks` (List): NTS/체불 DB 검증 결과
  - `businessDataAnalysis`, `postingTextAnalysis`: 분석 섹션
  - `concerns` (List): 통합 우려 항목
  - `finalSummary`, `userReport`
  - `openAiUsed` (boolean)
  - `imageUrl` (String): S3 URL

### `GET /api/job-postings/analyses/{analysisId}` — 분석 결과 조회
- **인증**: 불필요
- **Response**: `JobPostingAnalysisResponse`

---

## 7. 🤝 멘토 매칭 API (`/api/mentoring`) ⭐

### `POST /api/mentoring/mentor-profile` — 멘토 등록/수정
- **인증**: 필요
- **Request Body** (`MentorRegistrationRequest`):
  ```json
  {
    "nickname": "카페해방러",
    "industry": "FOOD_SERVICE",
    "damageTypes": ["WAGE_ARREARS", "WEEKLY_HOLIDAY"],
    "employmentType": "LONG_TERM_PART_TIME",
    "businessSize": "UNDER_5",
    "region": "SEOUL",
    "resolutionMethods": ["LABOR_OFFICE_REPORT"],
    "resolutionDays": 30,
    "damageAmountRange": "KRW_100K_500K",
    "bio": "카페 1년 알바하다 ...",
    "capacity": 3,
    "consultingFee": 10000,
    "verificationMethod": "RESOLVED_CASE",   // 또는 "EVIDENCE_UPLOAD"
    "verifiedCaseIds": [101],                  // RESOLVED_CASE인 경우
    "evidenceUrls": null                       // EVIDENCE_UPLOAD인 경우
  }
  ```
- **자격 검증 필수**: `verificationMethod`가 `null`이거나 해당 ID/URL이 비면 **400 에러**.

### `GET /api/mentoring/mentor-profile/me` — 내 멘토 프로필
- **인증**: 필요
- **Response**: `MentorProfile` (없으면 204)

### `POST /api/mentoring/match-request` — 멘티 매칭 요청 ⭐⭐⭐
- **인증**: 필요
- **Request Body** (`MatchRequestPayload`):
  ```json
  {
    "caseId": 1,
    "industry": "FOOD_SERVICE",
    "damageTypes": ["WAGE_ARREARS", "WEEKLY_HOLIDAY"],
    "employmentType": "LONG_TERM_PART_TIME",
    "businessSize": "UNDER_5",
    "region": "SEOUL",
    "damageAmountRange": "KRW_100K_500K",
    "description": "OO카페 - 미지급 추정 300,000원",
    "topK": 3
  }
  ```
- **Response 200** (`MatchResponseEnvelope`):
  ```json
  {
    "requestId": 1,
    "recommendations": [
      {
        "matchId": 1, "mentorProfileId": 1, "mentorUserId": 901,
        "mentorNickname": "카페해방러",
        "industry": "요식업",
        "damageTypes": ["임금체불", "주휴수당 미지급"],
        "businessSize": "5인 미만", "region": "서울특별시",
        "resolutionMethods": ["노동청 진정"],
        "isVerified": true, "averageRating": 4.8, "reviewCount": 12,
        "consultingFee": 10000,
        "bio": "카페 1년 알바하다 ...",
        "matchScore": 0.94,
        "ruleBasedScore": 0.91,
        "neuralScore": 0.97,
        "contributions": {
          "damageTypes": 0.18, "industry": 0.15, "businessSize": 0.20,
          "employmentType": 0.10, "damageAmountRange": 0.05,
          "region": 0.10, "resolutionMethods": 0.16
        },
        "matchReasons": [
          "같은 업종(요식업)",
          "같은 사업장 규모(5인 미만)",
          "같은 피해 경험(임금체불, 주휴수당 미지급)",
          "같은 지역(서울특별시)",
          "해결 경험(노동청 진정)"
        ],
        "rank": 1
      }
    ],
    "weights": { /* Thompson Sampling 샘플링 결과 */ },
    "algorithm": "Gower + Gale-Shapley + Thompson Sampling + Two-tower NN ensemble"
  }
  ```

### `POST /api/mentoring/match/{matchId}/confirm` — 매칭 확정
- **인증**: 필요 + 본인 매칭만
- **상태 전환**: `PROPOSED` → `ACTIVE`
- **Response**: `MentorshipMatch`

### `POST /api/mentoring/feedback` — 피드백 제출 (Thompson Sampling 학습)
- **인증**: 필요
- **Request Body** (`FeedbackRequest`):
  ```json
  {
    "matchId": 1, "rating": 5, "chatDays": 7,
    "resolved": true, "comment": "정말 도움 됐어요"
  }
  ```
- **Response**: 200 OK (가중치 자동 업데이트)

### `GET /api/mentoring/my-matches` — 내 매칭 이력
- **인증**: 필요
- **Response**: `List<MentorshipMatch>`

### `GET /api/mentoring/weights` — 모니터링/발표용
- **인증**: 불필요
- **Response**:
  ```json
  {
    "snapshot": {
      "damageTypes": { "alpha": 3.4, "beta": 1.2, "expected": 0.74 },
      ...
    },
    "expectedWeights": { "damageTypes": 1.85, ... },
    "sampledOnce": { "damageTypes": 1.72, ... }
  }
  ```

### `POST /api/mentoring/evidence/upload` — 자격 증빙 자료 업로드
- **인증**: 필요
- **Content-Type**: `multipart/form-data`
- **Form field**: `file` (File, required)
- **Response 200**: `{ "url": "https://.../mentor-evidence/..." }`

### `GET /api/mentoring/match/{matchId}/messages` — 채팅 메시지 조회 (폴링)
- **인증**: 필요 + 참여자만
- **Query**: `since` (ISO LocalDateTime, optional) — 해당 시각 이후만
- **Response**: `List<ChatMessage>`
  ```json
  [
    {
      "id": 1, "matchId": 1,
      "senderUserId": 5, "senderRole": "MENTEE",
      "text": "안녕하세요", "createdAt": "2026-05-29T01:23:45"
    }
  ]
  ```

### `POST /api/mentoring/match/{matchId}/messages` — 채팅 메시지 전송
- **인증**: 필요 + 참여자만
- **Request Body**: `{ "text": "메시지 내용" }`
- **Response**: 저장된 `ChatMessage`

---

## 8. 🛠 관리자 API (`/api/admin`)

### `POST /api/admin/businesses/import-local-data` — 사업체 CSV 임포트
- **인증**: 불필요 (운영 시 강화 필요)
- **Query**: `maxFiles` (int, optional)
- **Response**: 임포트 통계 (`scannedFiles`, `importedRows`, `skippedRows`, `totalBusinesses`)

---

## 9. ❤️ 헬스체크 (`/api/health`)

### `GET /api/health`
- **인증**: 불필요
- **Response**:
  ```json
  { "status": "UP", "database": "UP", "timestamp": "2026-05-29T01:23:45.678Z" }
  ```

---

## 10. 🔍 RAG 디버그 (`/api/dev/rag`)

### `GET /api/dev/rag/search?q={query}&topK={n}` — 법령 의미 검색
- **인증**: 불필요
- **Query**:
  - `q` (String, required): 자연어 쿼리
  - `topK` (int, default=5): 상위 N건
- **Response**:
  ```json
  {
    "query": "주 15시간 이상 근무 시 주휴수당",
    "topK": 5, "count": 3,
    "matches": [
      {
        "lawName": "근로기준법", "article": "55",
        "title": "휴일", "partNo": 1,
        "distance": "0.4548",
        "preview": "근로기준법 제55조(휴일) — ..."
      }
    ]
  }
  ```

---

## 📚 Enum 값 정리

### Industry (업종)
`FOOD_SERVICE` 요식업 / `DELIVERY` 배달·물류 / `CONVENIENCE_RETAIL` 편의점·판매 / `MANUFACTURING` 제조 / `OFFICE` 사무·관리 / `CONSTRUCTION` 건설 / `SERVICE` 서비스 / `EDUCATION` 교육·강사 / `HEALTHCARE` 의료·돌봄 / `OTHER` 기타

### DamageType (피해 유형, 다중선택)
`WAGE_ARREARS` 임금체불 / `SEVERANCE_PAY` 퇴직금 미지급 / `WEEKLY_HOLIDAY` 주휴수당 미지급 / `OVERTIME_PAY` 연장·야간수당 미지급 / `INSURANCE` 4대보험 미가입 / `UNFAIR_DISMISSAL` 부당해고 / `INDUSTRIAL_ACCIDENT` 산재 / `UNPAID_BONUS` 상여금 미지급 / `CONTRACT_BREACH` 계약 위반 / `OTHER`

### EmploymentType (고용 형태)
`SHORT_TERM_PART_TIME` 단기알바 / `LONG_TERM_PART_TIME` 장기알바 / `DAILY_WORKER` 일용직 / `CONTRACT` 계약직 / `FREELANCE` 프리랜서 / `REGULAR` 정규직 / `OTHER`

### BusinessSize (사업장 규모)
`UNDER_5` 5인 미만 (법 적용 차이 큼) / `SIZE_5_TO_30` 5~30인 / `OVER_30` 30인 이상 / `UNKNOWN`

### Region (시·도)
`SEOUL` / `BUSAN` / `DAEGU` / `INCHEON` / `GWANGJU` / `DAEJEON` / `ULSAN` / `SEJONG` / `GYEONGGI` / `GANGWON` / `CHUNGBUK` / `CHUNGNAM` / `JEONBUK` / `JEONNAM` / `GYEONGBUK` / `GYEONGNAM` / `JEJU` / `OTHER`

### ResolutionMethod (해결 방법)
`LABOR_OFFICE_REPORT` 노동청 진정 / `CIVIL_LAWSUIT` 민사소송 / `PAYMENT_ORDER` 지급명령 / `SETTLEMENT` 합의 / `LABOR_ATTORNEY` 노무사 상담 / `OTHER`

### DamageAmountRange (피해 금액 구간)
`UNDER_100K` 10만원 이하 / `KRW_100K_500K` 10~50만원 / `KRW_500K_1M` 50~100만원 / `KRW_1M_5M` 100~500만원 / `OVER_5M` 500만원 이상

### VerificationMethod (멘토 자격)
`RESOLVED_CASE` 앱 내 해결 경험 / `EVIDENCE_UPLOAD` 증빙 자료 업로드 / `ADMIN_VERIFIED` 관리자 승인 (현재 미사용)

### MatchStatus (매칭 상태)
`PROPOSED` 추천 (멘티 확정 대기) / `ACTIVE` 매칭 확정 (대화 중) / `COMPLETED` 사건 해결 / `CANCELED` 취소

### Report ViolationType (신고 유형)
`MINIMUM_WAGE` / `WEEKLY_HOLIDAY` / `OVERTIME` / `NIGHT` / `OTHER`

### Report Status
`PENDING` / `INSPECTING` / `CORRECTION_ORDERED` / `RESOLVED` / `UNRESOLVED`

---

## 🔁 표준 HTTP 응답 코드

| 코드 | 의미 |
|---|---|
| 200 OK | 성공 |
| 201 Created | 리소스 생성 성공 |
| 204 No Content | 성공, 응답 바디 없음 |
| 400 Bad Request | 요청 파라미터 오류 / 자격 검증 실패 |
| 401 Unauthorized | JWT 누락 또는 만료 |
| 403 Forbidden | 권한 없음 (CORS 차단 포함) |
| 404 Not Found | 리소스 없음 |
| 500 Internal Server Error | 서버 내부 오류 (S3 실패 등) |

---

## 🌐 데이터 흐름 핵심

### 계약서 분석 흐름
```
이미지 업로드
  → SHA-256 해시 → DB 캐시 적중 시 즉시 반환
  → S3 업로드
  → OpenAI Vision (gpt-4o) 추출
  → 시급 역산 (월급제 시)
  → pgvector 의미 검색 (법령 top-5 + 판례 top-4)
  → OpenAI gpt-4o-mini 위반 판단
  → Java 룰베이스 7종 검증
  → 중복 제거 + 법령/판례 자동 첨부
  → ContractFactSheet 생성
  → DB 영속 + 응답
```

### 매칭 흐름
```
신고 사건 → "연결할 멘토 찾기"
  → 한글 라벨 → enum 매핑
  → POST /api/mentoring/match-request
    → Thompson Sampling 가중치 샘플링
    → Gower Distance 계산 (검증된 멘토만)
    → Two-tower 신경망 추론 (가용 시)
    → 앙상블: 0.5·Gower + 0.5·Neural
    → Gale-Shapley + capacity 제약
  → Top-3 추천 카드 (매칭도 + 추천 이유 + 기여도)
  → 매칭 확정 (PROPOSED → ACTIVE)
  → 채팅방 진입 (REST 폴링)
  → 사건 해결 후 피드백 → Thompson Sampling 자동 학습
```

### 출퇴근 흐름
```
관심업장 등록 → BSSID 스캔
  → POST /api/working/register-workplace
    → PartTimeJob 자동 생성 + BSSID 영속
  → 출근 시 POST /api/working/clock-in
    → BSSID 검증
  → 퇴근 시 POST /api/working/clock-out
    → 근무 분 자동 계산
```

---

## 📌 알려진 한계 (개선 후보)

| 항목 | 현재 상태 | 개선 방향 |
|---|---|---|
| `/api/working/**` 일부 인증 미적용 | clock-in/out이 `@AuthenticationPrincipal` 미사용 | userId 기반 격리 추가 |
| `/api/admin/**` 인증 없음 | permitAll | admin role 검증 |
| BSSID 검증 | 단순 문자열 일치 | 위치 좌표 추가 검증 |
| 채팅 | REST 5초 폴링 | WebSocket 전환 |
| 진정서 PDF | 텍스트만 | iText로 PDF 생성 |
| 결제 | mock | Toss/KakaoPay 연동 |
| FCM 푸시 | 토큰 등록 코드 없음 | 프론트에서 등록 + 백엔드 사용 |

---

## 🔗 환경 변수 (`/home/ubuntu/app/back/.env`)

```bash
DB_URL=jdbc:postgresql://albasave-db.../albasave
DB_USERNAME=postgres
DB_PASSWORD=<RDS 비밀번호>

AWS_S3_BUCKET=albasave-storage-new
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY=<AWS access key>
AWS_SECRET_KEY=<AWS secret key>

OPENAI_API_KEY=<OpenAI 키>
OPENAI_MODEL=gpt-4o

NTS_SERVICE_KEY=<국세청 키>
SBIZ_SERVICE_KEY=<중소벤처 키>
JUSO_API_KEY=<도로명주소 키>
LAW_API_OC=albasave

WAGE_ARREARS_CSV_PATH=/home/ubuntu/wage-arrears.csv

JWT_SECRET=<256bit 이상>
JWT_EXPIRATION_MS=86400000

CORS_ALLOWED_ORIGINS=http://localhost:3000,8081,...
```

---

## 📖 추가 개발 시 가이드

1. **새 엔드포인트 추가 시**:
   - `@RestController` + `@RequestMapping("/api/...")`
   - `@AuthenticationPrincipal Long userId`로 사용자 격리
   - DTO는 `dto/` 패키지에 분리
   - JavaDoc 필수

2. **DB 컬럼 추가 시**:
   - JPA `ddl-auto: update`라서 엔티티만 수정하면 자동 생성됨
   - 단, **제약 변경(NOT NULL, UNIQUE)은 수동 SQL 필요**

3. **CORS 추가 시**:
   - `application.yml`의 `CORS_ALLOWED_ORIGINS` 환경변수에 콤마로 추가

4. **외부 API 연동 시**:
   - `application.yml`에 `${ENV_VAR:default}` 패턴으로
   - `.env`에 실제 값 → `/home/ubuntu/app/back/.env`에 push

5. **테스트**:
   - 현재 단위 테스트 미작성. 추후 `@SpringBootTest` 추가 권장

---

## 🆘 트러블슈팅

| 증상 | 해결 |
|---|---|
| 401 Unauthorized | JWT 토큰 만료 (24시간) → 재로그인 |
| 403 Forbidden | CORS 차단 → `CORS_ALLOWED_ORIGINS`에 origin 추가 |
| OpenAI 호출 실패 | 크레딧 소진 → platform.openai.com 충전 |
| 분석 결과 비결정적 | 동일 이미지면 SHA-256 캐싱 적용됨 (다른 이미지는 LLM 변동) |
| BSSID 검증 실패 | 현재 WiFi BSSID와 등록된 BSSID 불일치 → 재등록 필요 |

---

**문서 작성**: Claude Code (2026-05-29)
**Git 기준**: `main` 브랜치 (커밋 `4ab8c18b`)
