# 📚 알바지킴이 개발자 문서

추가 개발자를 위한 레퍼런스 모음.

## 문서 목록

| 파일 | 내용 |
|---|---|
| [`API-REFERENCE.md`](./API-REFERENCE.md) | 전체 백엔드 REST API 명세 (Auth/계약서/공고/멘토/채팅/출퇴근/신고/RAG) |
| [`ANDROID-DEMO-GUIDE.md`](./ANDROID-DEMO-GUIDE.md) | EAS 빌드 + 시연 시나리오 + 트러블슈팅 |
| [`REPORT_SPEC.md`](./REPORT_SPEC.md) (있다면) | 신고 흐름 사양 |

## 빠른 시작

### 백엔드 로컬 실행
```bash
cd back/albasave-server
cp .env.example .env  # 필요 값 직접 채우기
./gradlew bootRun
# → http://localhost:8080
```

### 프론트 로컬 실행
```bash
cd Front
npm install --legacy-peer-deps
# .env: EXPO_PUBLIC_API_URL=http://13.124.178.60:8080/api (운영 EC2 사용)
#       또는 http://localhost:8080/api (로컬 백엔드)
npx expo start --web --port 8081
```

### 운영 인프라
| 자원 | 값 |
|---|---|
| EC2 | `13.124.178.60` (t3.small) |
| RDS | PostgreSQL 18.3 + pgvector |
| S3 | `albasave-storage-new` |
| systemd | `albasave.service` (auto-restart) |
| 자동 배포 | GitHub Actions (push to `main` → EC2) |

### 핵심 기술 스택

| 영역 | 기술 |
|---|---|
| 백엔드 | Spring Boot 3.5 (Java 17), JPA, pgvector |
| 프론트 | React Native + Expo SDK 51 + TypeScript |
| AI | OpenAI Vision (gpt-4o, gpt-4o-mini), text-embedding-3-small |
| RAG | pgvector + hnsw + 법제처 859 청크 |
| 매칭 | Gower Distance + Gale-Shapley + Thompson Sampling + Two-tower 신경망 |
| 인증 | JWT + Spring Security |
| 자동 배포 | GitHub Actions + systemd |

## 디렉터리 구조

```
back/albasave-server/        Spring Boot 백엔드
  src/main/java/com/albasave/albasave_server/
    auth/                    인증
    contract/                계약서 분석 + ContractFactSheet
    jobposting/              공고 분석 (Vision + 공공 데이터)
    lawapi/                  법제처 API + RAG (pgvector)
    mentoring/               멘토 매칭 (5단계 알고리즘 + 신경망)
    report/                  임금체불 신고
    workinglog/              출퇴근 + BSSID
    juso/, business/, wagearrears/  공공 데이터 클라이언트

Front/src/                   React Native + Expo
  app/                       Expo Router 라우트
  views/                     화면 컴포넌트 (FSD 구조)
  features/                  비즈니스 로직
  entities/                  도메인 (API + 타입)
  shared/                    공통 (axios, UI, 유틸)

ml/mentoring/                Two-tower 신경망 학습 코드
  generate_synthetic_data.py
  train_two_tower.py
  data/two_tower_weights.json   (EC2에도 배포됨)

docs/                        개발자 문서 (이 폴더)
.github/workflows/           GitHub Actions
```

## 추가 개발 시 체크리스트

- [ ] 새 API는 `@AuthenticationPrincipal Long userId`로 사용자 격리
- [ ] DTO는 `dto/` 패키지에 분리, JavaDoc 필수
- [ ] 새 엔티티는 `domain/`, repository는 `repository/`
- [ ] 외부 API 키는 `application.yml`의 `${ENV:default}` 패턴 + `.env` 추가
- [ ] CORS 추가 origin은 `CORS_ALLOWED_ORIGINS`에
- [ ] 프론트 새 호출은 `entities/{도메인}/api/*.ts`로 분리
- [ ] 프론트 store는 Zustand, persist 시 `version` + `migrate` 함께 명시
- [ ] 빌드 후 `git push` → main이면 자동 배포 (GitHub Actions)

## 백업/롤백

| 태그 | 시점 |
|---|---|
| `backup/2026-05-29-main-merged` | main 머지 시점 (현재 안정) |
| `backup/2026-05-29-mentoring-full` | 피드백·증빙·채팅 통합 |
| `backup/2026-05-29-mentoring-phase23` | Two-tower 적용 |
| `backup/2026-05-29-mentoring-phase1` | 매칭 알고리즘 |
| `backup/2026-05-28-rag-level3` | RAG Level 3 |
| `backup/2026-05-28-after-contract-fix` | 계약서 정확도 |
| `backup/2026-05-28-stable-after-merge` | 시작점 |

문제 발생 시: `git checkout <태그>` → 즉시 복구.
