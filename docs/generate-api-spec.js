const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat
} = require('docx');
const fs = require('fs');

const COLORS = {
  primary: '1F4E79',
  secondary: '2E75B6',
  get: '1E6823',
  post: '0B5394',
  delete: '7B0000',
  put: '7B4A00',
  headerBg: 'D6E4F0',
  rowAlt: 'F5F9FD',
  border: 'BDD7EE',
  danger: 'C00000',
  warning: 'E67E00',
  success: '1E6823',
};

const border = { style: BorderStyle.SINGLE, size: 1, color: COLORS.border };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 32, color: COLORS.primary, font: 'Arial' })],
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLORS.secondary, space: 4 } },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26, color: COLORS.secondary, font: 'Arial' })],
    spacing: { before: 300, after: 120 },
  });
}

function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: '2F5496', font: 'Arial' })],
    spacing: { before: 200, after: 80 },
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: 'Arial', ...opts })],
    spacing: { after: 80 },
  });
}

function methodBadge(method) {
  const colorMap = { GET: COLORS.get, POST: COLORS.post, DELETE: COLORS.delete, PUT: COLORS.put };
  return new TextRun({ text: ` ${method} `, bold: true, size: 18, font: 'Arial', color: 'FFFFFF',
    highlight: undefined, shading: { fill: colorMap[method] || '555555', type: ShadingType.CLEAR } });
}

function endpointTitle(method, path, desc) {
  return new Paragraph({
    children: [
      methodBadge(method),
      new TextRun({ text: `  ${path}`, bold: true, size: 22, font: 'Courier New', color: '1F1F1F' }),
      new TextRun({ text: `  — ${desc}`, size: 20, font: 'Arial', color: '555555' }),
    ],
    spacing: { before: 200, after: 80 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: COLORS.secondary, space: 6 } },
    indent: { left: 120 },
  });
}

function tableHeader(cols, widths) {
  return new TableRow({
    tableHeader: true,
    children: cols.map((col, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ children: [new TextRun({ text: col, bold: true, size: 18, font: 'Arial', color: COLORS.primary })] })],
    }))
  });
}

function tableRow(cells, widths, shade = false) {
  return new TableRow({
    children: cells.map((cell, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: shade ? COLORS.rowAlt : 'FFFFFF', type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: cell || '-', size: 18, font: 'Arial' })] })],
    }))
  });
}

function makeTable(headers, rows, widths) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      tableHeader(headers, widths),
      ...rows.map((r, i) => tableRow(r, widths, i % 2 === 1)),
    ],
  });
}

function authNote(required) {
  const color = required ? COLORS.danger : COLORS.success;
  const text = required ? '  🔒 인증 필요 (Authorization: Bearer <JWT>)' : '  🔓 인증 불필요';
  return new Paragraph({
    children: [new TextRun({ text, size: 18, font: 'Arial', color, bold: true })],
    spacing: { after: 80 },
    indent: { left: 240 },
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: 100 } });
}

// ──────────────── DOCUMENT ────────────────

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: COLORS.primary },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: COLORS.secondary },
        paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 },
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [
            new TextRun({ text: '안심알바', bold: true, size: 20, font: 'Arial', color: COLORS.primary }),
            new TextRun({ text: '  |  API 명세서  v1.0', size: 20, font: 'Arial', color: '888888' }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.secondary } },
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', size: 18, font: 'Arial', color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '888888' }),
            new TextRun({ text: ' / ', size: 18, font: 'Arial', color: '888888' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: 'Arial', color: '888888' }),
          ],
        })]
      })
    },
    children: [

      // ══════════ 표지 ══════════
      new Paragraph({ children: [new TextRun('')], spacing: { after: 1200 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '안심알바', bold: true, size: 72, font: 'Arial', color: COLORS.primary })],
        spacing: { after: 160 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'API 명세서', bold: true, size: 52, font: 'Arial', color: COLORS.secondary })],
        spacing: { after: 160 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Backend ↔ Frontend Integration Guide', size: 26, font: 'Arial', color: '888888' })],
        spacing: { after: 400 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.secondary } },
        children: [],
        spacing: { after: 400 },
      }),
      makeTable(
        ['항목', '내용'],
        [
          ['버전', 'v1.0'],
          ['작성일', '2026-05-26'],
          ['백엔드', 'Spring Boot 3.5 / Java 17 / PostgreSQL'],
          ['프론트엔드', 'React Native (Expo) / TypeScript'],
          ['인증 방식', 'JWT Bearer Token'],
          ['Base URL', 'http://<서버주소>/api'],
          ['파일 저장소', 'AWS S3'],
          ['작성자', 'CapstoneDesign2 팀'],
        ],
        [2400, 6000]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 1. 개요 ══════════
      heading1('1. API 개요'),
      para('본 문서는 안심알바 앱의 백엔드(Spring Boot)와 프론트엔드(React Native) 간 연동을 위한 REST API 명세서입니다.'),
      spacer(),

      heading2('1.1 공통 규칙'),
      makeTable(
        ['항목', '규칙'],
        [
          ['Base URL', 'http://<서버주소>/api'],
          ['Content-Type', 'application/json (파일 업로드: multipart/form-data)'],
          ['인코딩', 'UTF-8'],
          ['날짜 형식', 'ISO 8601 (예: 2025-06-01T09:00:00)'],
          ['시간 형식', 'HH:mm:ss (예: 09:00:00)'],
          ['날짜 전용', 'YYYY-MM-DD (예: 2025-06-01)'],
        ],
        [2400, 6000]
      ),
      spacer(),

      heading2('1.2 인증'),
      para('보호된 API는 모든 요청 헤더에 JWT 토큰을 포함해야 합니다.'),
      new Paragraph({
        children: [new TextRun({ text: 'Authorization: Bearer <JWT_TOKEN>', font: 'Courier New', size: 20, color: COLORS.post })],
        shading: { fill: 'F0F4F8', type: ShadingType.CLEAR },
        spacing: { before: 80, after: 80 },
        indent: { left: 360 },
      }),
      spacer(),

      heading2('1.3 HTTP 상태 코드'),
      makeTable(
        ['코드', '의미', '설명'],
        [
          ['200 OK', '성공', 'GET, PUT 요청 성공'],
          ['201 Created', '생성 완료', 'POST 요청으로 리소스 생성 성공'],
          ['400 Bad Request', '잘못된 요청', '유효성 검증 실패 또는 비즈니스 로직 오류'],
          ['401 Unauthorized', '인증 필요', '토큰 없음 또는 만료'],
          ['403 Forbidden', '권한 없음', '접근 권한 부족'],
          ['404 Not Found', '리소스 없음', '요청한 데이터가 존재하지 않음'],
          ['500 Internal Server Error', '서버 오류', '서버 내부 처리 오류'],
        ],
        [2000, 2400, 4200]
      ),
      spacer(),

      heading2('1.4 인증 불필요 엔드포인트'),
      makeTable(
        ['경로 패턴', '설명'],
        [
          ['/api/auth/**', '로그인, 회원가입'],
          ['/api/health', '서버 상태 확인'],
          ['/api/admin/**', '관리자 전용'],
          ['/api/job-postings/**', '구인공고 분석'],
          ['/api/working/**', '출퇴근 기록 (현재 인증 제외 설정)'],
        ],
        [3600, 5000]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 2. 인증 API ══════════
      heading1('2. 인증 API'),

      // 2.1 회원가입
      heading2('2.1 회원가입'),
      endpointTitle('POST', '/api/auth/signup', '새 계정 생성'),
      authNote(false),
      heading3('Request Body'),
      makeTable(
        ['필드명', '타입', '필수', '설명'],
        [
          ['email', 'String', 'Y', '이메일 주소 (형식 검증)'],
          ['password', 'String', 'Y', '비밀번호 (최소 6자)'],
          ['name', 'String', 'Y', '사용자 이름'],
          ['phoneNumber', 'String', 'N', '휴대폰 번호'],
        ],
        [2200, 1400, 1000, 3960]
      ),
      spacer(),
      heading3('Response (201 Created)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['token', 'String', 'JWT 토큰'],
          ['userId', 'Long', '사용자 ID'],
          ['name', 'String', '사용자 이름'],
          ['email', 'String', '이메일'],
        ],
        [2200, 1400, 4960]
      ),
      spacer(),

      // 2.2 로그인
      heading2('2.2 로그인'),
      endpointTitle('POST', '/api/auth/login', 'JWT 토큰 발급'),
      authNote(false),
      heading3('Request Body'),
      makeTable(
        ['필드명', '타입', '필수', '설명'],
        [
          ['email', 'String', 'Y', '이메일'],
          ['password', 'String', 'Y', '비밀번호'],
        ],
        [2200, 1400, 1000, 3960]
      ),
      spacer(),
      heading3('Response (200 OK)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['token', 'String', 'JWT 토큰'],
          ['userId', 'Long', '사용자 ID'],
          ['name', 'String', '사용자 이름'],
          ['email', 'String', '이메일'],
        ],
        [2200, 1400, 4960]
      ),
      spacer(),

      // 2.3 내 정보 조회
      heading2('2.3 내 정보 조회'),
      endpointTitle('GET', '/api/auth/me', '현재 로그인된 사용자 정보 반환'),
      authNote(true),
      heading3('Response (200 OK)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['token', 'String', 'JWT 토큰'],
          ['userId', 'Long', '사용자 ID'],
          ['name', 'String', '사용자 이름'],
          ['email', 'String', '이메일'],
        ],
        [2200, 1400, 4960]
      ),
      spacer(),

      // 2.4 FCM 토큰
      heading2('2.4 FCM 토큰 업데이트'),
      endpointTitle('PUT', '/api/auth/fcm-token', '푸시 알림용 FCM 토큰 갱신'),
      authNote(true),
      heading3('Request Body'),
      makeTable(
        ['필드명', '타입', '필수', '설명'],
        [['fcmToken', 'String', 'Y', 'Firebase Cloud Messaging 토큰']],
        [2200, 1400, 1000, 3960]
      ),
      spacer(),
      para('Response: 200 OK (빈 응답)'),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 3. 알바 정보 ══════════
      heading1('3. 알바 정보 API'),

      heading2('3.1 알바 등록'),
      endpointTitle('POST', '/api/part-time-jobs', '새 알바 정보 등록'),
      authNote(true),
      heading3('Request Body'),
      makeTable(
        ['필드명', '타입', '필수', '설명'],
        [
          ['businessId', 'Long', 'N', '사업장 ID'],
          ['businessName', 'String', 'Y', '사업장 이름'],
          ['day', 'String', 'Y', '근무 요일 (예: "MON,TUE,WED,THU,FRI")'],
          ['startTime', 'LocalTime', 'Y', '예정 출근 시각 (예: "09:00:00")'],
          ['endTime', 'LocalTime', 'Y', '예정 퇴근 시각 (예: "18:00:00")'],
          ['startDay', 'LocalDate', 'Y', '알바 시작일 (예: "2025-06-01")'],
          ['endDay', 'LocalDate', 'N', '알바 종료일'],
          ['hourlyWage', 'Integer', 'N', '시급 (원, 미입력 시 최저시급 적용)'],
        ],
        [2400, 1600, 900, 3660]
      ),
      spacer(),
      heading3('Response (201 Created)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['id', 'Long', '알바 ID'],
          ['businessId', 'Long', '사업장 ID'],
          ['businessName', 'String', '사업장 이름'],
          ['hourlyWage', 'Integer', '시급 (원)'],
          ['day', 'String', '근무 요일 문자열'],
          ['startTime', 'LocalTime', '예정 출근 시각'],
          ['endTime', 'LocalTime', '예정 퇴근 시각'],
          ['startDay', 'LocalDate', '시작일'],
          ['endDay', 'LocalDate', '종료일'],
          ['isActive', 'Boolean', '활성화 여부'],
          ['bssid', 'String', '등록된 WiFi BSSID'],
          ['contract', 'String', '계약서 파일 경로 또는 URL'],
        ],
        [2200, 1400, 4960]
      ),
      spacer(),

      heading2('3.2 알바 목록 조회'),
      endpointTitle('GET', '/api/part-time-jobs', '내 알바 목록'),
      authNote(true),
      para('Response (200 OK): PartTimeJobResponse 배열 (3.1 응답 구조 동일)'),
      spacer(),

      heading2('3.3 알바 삭제'),
      endpointTitle('DELETE', '/api/part-time-jobs/{id}', '알바 비활성화'),
      authNote(true),
      makeTable(
        ['파라미터', '타입', '설명'],
        [['id', 'Long (Path)', '삭제할 알바 ID']],
        [2400, 2000, 4160]
      ),
      spacer(),
      para('Response: 200 OK (빈 응답)'),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 4. 출퇴근 ══════════
      heading1('4. 출퇴근 기록 API'),

      heading2('4.1 WiFi BSSID 등록'),
      endpointTitle('POST', '/api/working/bssid/{partTimeJobId}', '업장 WiFi 등록 (출퇴근 활성화)'),
      authNote(false),
      heading3('Path Parameter'),
      makeTable(
        ['파라미터', '타입', '설명'],
        [['partTimeJobId', 'Long', '등록할 알바 ID']],
        [2400, 1400, 4760]
      ),
      spacer(),
      heading3('Request Body'),
      makeTable(
        ['필드명', '타입', '필수', '설명'],
        [['bssid', 'String', 'Y', '등록할 WiFi BSSID (예: "AA:BB:CC:DD:EE:FF")']],
        [2200, 1400, 1000, 3960]
      ),
      spacer(),
      para('Response: 200 OK (빈 응답)'),
      spacer(),

      heading2('4.2 출근 처리'),
      endpointTitle('POST', '/api/working/clock-in', '출근 기록 생성'),
      authNote(false),
      heading3('Request Body'),
      makeTable(
        ['필드명', '타입', '필수', '설명'],
        [
          ['partTimeJobId', 'Long', 'Y', '출근할 알바 ID'],
          ['bssid', 'String', 'Y', '현재 연결된 WiFi BSSID (없으면 빈 문자열)'],
        ],
        [2400, 1400, 900, 3860]
      ),
      spacer(),
      heading3('Response (200 OK)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['id', 'Long', '근무 기록 ID'],
          ['partTimeJobId', 'Long', '알바 ID'],
          ['realStartTime', 'LocalDateTime', '실제 출근 시각'],
          ['realEndTime', 'LocalDateTime', '퇴근 시각 (출근 직후 null)'],
          ['workingMinutes', 'Long', '총 근무 시간(분) (출근 직후 null)'],
          ['inProgress', 'Boolean', '현재 출근 중 여부 (true)'],
        ],
        [2400, 1800, 4360]
      ),
      spacer(),

      heading2('4.3 퇴근 처리'),
      endpointTitle('POST', '/api/working/clock-out', '퇴근 기록 완료'),
      authNote(false),
      heading3('Request Body'),
      makeTable(
        ['필드명', '타입', '필수', '설명'],
        [
          ['workingId', 'Long', 'Y', '퇴근 처리할 근무 기록 ID (출근 시 반환된 id)'],
          ['bssid', 'String', 'Y', '현재 연결된 WiFi BSSID'],
        ],
        [2400, 1400, 900, 3860]
      ),
      spacer(),
      para('Response (200 OK): 4.2 응답 구조 동일 (inProgress: false, workingMinutes 계산됨)'),
      spacer(),

      heading2('4.4 현재 출근 상태 조회'),
      endpointTitle('GET', '/api/working/current/{partTimeJobId}', '현재 출근 중인 기록 조회'),
      authNote(false),
      para('Response (200 OK): 출근 중이면 WorkingResponse, 없으면 null'),
      spacer(),

      heading2('4.5 출퇴근 이력 조회'),
      endpointTitle('GET', '/api/working/history/{partTimeJobId}', '전체 출퇴근 이력'),
      authNote(false),
      para('Response (200 OK): WorkingResponse 배열 (4.2 응답 구조 동일)'),
      spacer(),

      heading2('4.6 총 근무 시간 조회'),
      endpointTitle('GET', '/api/working/total-minutes/{partTimeJobId}', '누적 근무 시간(분) 조회'),
      authNote(false),
      makeTable(
        ['필드명', '타입', '설명'],
        [['totalMinutes', 'Long', '총 근무 시간 (분)']],
        [2400, 1800, 4360]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 5. 계약서 분석 ══════════
      heading1('5. 근로계약서 분석 API'),

      heading2('5.1 계약서 분석 (이미지 업로드)'),
      endpointTitle('POST', '/api/contracts/analyze', '계약서 이미지 OCR 및 위법성 분석'),
      authNote(true),
      para('Content-Type: multipart/form-data'),
      heading3('Request (Form Data)'),
      makeTable(
        ['파라미터', '타입', '필수', '설명'],
        [
          ['image', 'MultipartFile', 'Y', '계약서 이미지 파일'],
          ['partTimeJobId', 'Long', 'N', '연결할 알바 ID'],
        ],
        [2400, 1800, 900, 3460]
      ),
      spacer(),
      heading3('Response (201 Created)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['contractId', 'Long', '계약서 분석 ID'],
          ['hasViolation', 'Boolean', '위반 여부'],
          ['extractedInfo.hourlyWage', 'Integer', '추출한 시급'],
          ['extractedInfo.workingHoursPerDay', 'Double', '1일 소정근로시간'],
          ['extractedInfo.workingDaysPerWeek', 'Integer', '주 근무일 수'],
          ['extractedInfo.startDate', 'String', '근무 시작일'],
          ['extractedInfo.workPlace', 'String', '근무 장소'],
          ['extractedInfo.jobDescription', 'String', '업무 내용'],
          ['extractedInfo.weeklyHolidayAllowanceMentioned', 'Boolean', '주휴수당 명시 여부'],
          ['extractedInfo.overtimeAllowanceMentioned', 'Boolean', '연장·야간수당 명시 여부'],
          ['extractedInfo.annualLeaveMentioned', 'Boolean', '연차유급휴가 명시 여부'],
          ['extractedInfo.employerName', 'String', '고용주명'],
          ['extractedInfo.businessRegistrationNumber', 'String', '사업자등록번호'],
          ['violations[].type', 'String', '위반 유형'],
          ['violations[].severity', 'String', '심각도'],
          ['violations[].description', 'String', '설명'],
          ['violations[].legalBasis', 'String', '법적 근거'],
          ['summary', 'String', '분석 요약'],
          ['minimumWage', 'Integer', '최저시급 (비교용)'],
          ['imageUrl', 'String', 'S3 이미지 URL'],
          ['createdAt', 'LocalDateTime', '생성 시각'],
        ],
        [3200, 1600, 3760]
      ),
      spacer(),

      heading2('5.2 계약서 분석 이력 조회'),
      endpointTitle('GET', '/api/contracts', '내 계약서 분석 목록'),
      authNote(true),
      para('Response (200 OK): ContractAnalysisResponse 배열 (5.1 응답 구조 동일)'),
      spacer(),

      heading2('5.3 특정 계약서 분석 결과 조회'),
      endpointTitle('GET', '/api/contracts/{contractId}', '계약서 분석 결과 단건 조회'),
      authNote(true),
      para('Response (200 OK): ContractAnalysisResponse (5.1 응답 구조 동일)'),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 6. 구인공고 분석 ══════════
      heading1('6. 구인공고 분석 API'),

      heading2('6.1 구인공고 분석'),
      endpointTitle('POST', '/api/job-postings/analyze', '구인공고 이미지 업로드 및 위험도 분석'),
      authNote(false),
      para('Content-Type: multipart/form-data'),
      heading3('Request (Form Data)'),
      makeTable(
        ['파라미터', '타입', '필수', '설명'],
        [['image', 'MultipartFile', 'Y', '구인공고 이미지 파일']],
        [2400, 1800, 900, 3460]
      ),
      spacer(),
      heading3('Response (200 OK)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['analysisId', 'Long', '분석 ID'],
          ['extracted.businessName', 'String', '사업장명'],
          ['extracted.brandName', 'String', '브랜드명'],
          ['extracted.businessRegistrationNumber', 'String', '사업자등록번호'],
          ['extracted.hourlyWage', 'Integer', '시급 (원)'],
          ['extracted.workDays', 'List<String>', '근무 요일 목록'],
          ['extracted.workTimeText', 'String', '근무 시간 텍스트'],
          ['extracted.suspiciousPhrases', 'List<String>', '의심 구절'],
          ['extracted.missingInformation', 'List<String>', '누락된 정보'],
          ['businessCandidates[].businessName', 'String', '매칭된 사업장명'],
          ['businessCandidates[].businessStatus', 'String', '사업장 상태 (정상/폐업/확인불가)'],
          ['businessCandidates[].matchScore', 'Integer', '매칭 점수'],
          ['concerns[].type', 'String', '우려 유형'],
          ['concerns[].severity', 'String', '심각도 (danger/warning/info)'],
          ['concerns[].title', 'String', '제목'],
          ['concerns[].description', 'String', '설명'],
          ['externalChecks[].source', 'String', '외부 체크 출처'],
          ['externalChecks[].status', 'String', '상태'],
          ['finalSummary', 'String', '최종 분석 요약'],
          ['imageUrl', 'String', 'S3 이미지 URL'],
          ['openAiUsed', 'Boolean', 'OpenAI 사용 여부'],
        ],
        [3200, 1600, 3760]
      ),
      spacer(),

      heading2('6.2 구인공고 분석 결과 조회'),
      endpointTitle('GET', '/api/job-postings/analyses/{analysisId}', '분석 결과 단건 조회'),
      authNote(false),
      para('Response (200 OK): JobPostingAnalysisResponse (6.1 응답 구조 동일)'),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 7. 신고 API ══════════
      heading1('7. 임금체불 신고 API'),

      heading2('7.1 신고 생성'),
      endpointTitle('POST', '/api/reports', '임금체불 신고 접수'),
      authNote(true),
      heading3('Request Body'),
      makeTable(
        ['필드명', '타입', '필수', '설명'],
        [
          ['partTimeJobId', 'Long', 'N', '알바 ID'],
          ['businessRegistrationNumber', 'String', 'N', '사업자등록번호'],
          ['businessId', 'Long', 'N', '사업장 ID'],
          ['businessName', 'String', 'Y', '사업장명'],
          ['violationType', 'String', 'N', '체불 유형 (MINIMUM_WAGE / WEEKLY_HOLIDAY / OVERTIME / NIGHT / OTHER)'],
          ['description', 'String', 'Y', '체불 설명'],
          ['hourlyWage', 'Integer', 'N', '계약 시급 (0이면 최저시급 적용)'],
          ['actualReceivedAmount', 'Long', 'N', '실제 받은 금액'],
          ['manualUnpaidAmount', 'Long', 'N', '직접 입력한 체불액'],
          ['evidenceImageUrl', 'String', 'N', '증거 이미지 URL (S3)'],
        ],
        [2800, 1400, 900, 3460]
      ),
      spacer(),
      heading3('Response (201 Created)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['id', 'Long', '신고 ID'],
          ['businessName', 'String', '사업장명'],
          ['violationType', 'String', '체불 유형'],
          ['unpaidAmount', 'Long', '체불액 (원)'],
          ['description', 'String', '설명'],
          ['evidenceImageUrl', 'String', '증거 이미지 URL'],
          ['complaintDraft', 'String', '진정서 초안 텍스트'],
          ['complaintPdfUrl', 'String', '진정서 PDF URL'],
          ['status', 'String', '신고 상태 (DRAFT / SUBMITTED / MATCHED)'],
          ['createdAt', 'LocalDateTime', '생성 시각'],
          ['wageBreakdown.hourlyWage', 'Integer', '시급'],
          ['wageBreakdown.totalWorkHours', 'Double', '총 근무 시간(시간)'],
          ['wageBreakdown.basePay', 'Long', '기본급'],
          ['wageBreakdown.weeklyHolidayPay', 'Long', '주휴수당'],
          ['wageBreakdown.overtimePay', 'Long', '연장수당'],
          ['wageBreakdown.nightPay', 'Long', '야간수당'],
          ['wageBreakdown.totalShouldReceive', 'Long', '총 수령 예상액'],
          ['wageBreakdown.minimumWage', 'Integer', '최저시급'],
          ['hasCollectiveActionPartners', 'Boolean', '공동대응 파트너 여부'],
        ],
        [3200, 1600, 3760]
      ),
      spacer(),

      heading2('7.2 신고 목록 조회'),
      endpointTitle('GET', '/api/reports', '내 신고 목록'),
      authNote(true),
      heading3('Response (200 OK) — ReportSummary 배열'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['id', 'Long', '신고 ID'],
          ['businessName', 'String', '사업장명'],
          ['violationType', 'String', '체불 유형'],
          ['unpaidAmount', 'Long', '체불액'],
          ['status', 'String', '상태'],
          ['createdAt', 'LocalDateTime', '생성 시각'],
        ],
        [2400, 1600, 4560]
      ),
      spacer(),

      heading2('7.3 신고 상세 조회'),
      endpointTitle('GET', '/api/reports/{reportId}', '신고 상세 조회'),
      authNote(true),
      para('Response (200 OK): ReportResponse (7.1 응답 구조 동일)'),
      spacer(),

      heading2('7.4 진정서 초안 생성'),
      endpointTitle('POST', '/api/reports/{reportId}/complaint-draft', 'AI 기반 진정서 생성'),
      authNote(true),
      heading3('Response (200 OK)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['reportId', 'Long', '신고 ID'],
          ['complaintDraft', 'String', '생성된 진정서 텍스트'],
          ['submissionUrl', 'String', '제출 URL'],
        ],
        [2400, 1600, 4560]
      ),
      spacer(),

      heading2('7.5 임금 계산'),
      endpointTitle('GET', '/api/reports/wage-calc', '알바 ID 기반 임금 자동 계산'),
      authNote(true),
      heading3('Query Parameters'),
      makeTable(
        ['파라미터', '타입', '필수', '설명'],
        [
          ['partTimeJobId', 'Long', 'Y', '알바 ID'],
          ['hourlyWage', 'Integer', 'N', '시급 (미입력 시 최저시급)'],
        ],
        [2400, 1400, 900, 3860]
      ),
      spacer(),
      heading3('Response (200 OK) — WageBreakdown'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['hourlyWage', 'Integer', '시급'],
          ['totalWorkMinutes', 'Long', '총 근무 시간(분)'],
          ['totalWorkHours', 'Double', '총 근무 시간(시간)'],
          ['basePay', 'Long', '기본급'],
          ['weeklyHolidayPay', 'Long', '주휴수당'],
          ['overtimePay', 'Long', '연장수당'],
          ['nightPay', 'Long', '야간수당'],
          ['totalShouldReceive', 'Long', '총 수령 예상액'],
          ['minimumWage', 'Integer', '최저시급'],
        ],
        [2400, 1600, 4560]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 8. 기타 ══════════
      heading1('8. 기타 API'),

      heading2('8.1 서버 상태 확인'),
      endpointTitle('GET', '/api/health', '서버 및 DB 상태 확인'),
      authNote(false),
      heading3('Response (200 OK)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['status', 'String', '"UP"'],
          ['database', 'String', '"UP" 또는 "UNKNOWN"'],
          ['timestamp', 'String', 'ISO 8601 타임스탬프'],
        ],
        [2400, 1600, 4560]
      ),
      spacer(),

      heading2('8.2 사업장 데이터 임포트 (관리자)'),
      endpointTitle('POST', '/api/admin/businesses/import-local-data', 'CSV 사업장 데이터 일괄 임포트'),
      authNote(false),
      heading3('Query Parameters'),
      makeTable(
        ['파라미터', '타입', '필수', '설명'],
        [['maxFiles', 'Integer', 'N', '최대 파일 수 제한']],
        [2400, 1400, 900, 3860]
      ),
      spacer(),
      heading3('Response (200 OK)'),
      makeTable(
        ['필드명', '타입', '설명'],
        [
          ['scannedFiles', 'Integer', '스캔한 파일 수'],
          ['importedRows', 'Long', '임포트한 행 수'],
          ['skippedRows', 'Long', '스킵한 행 수'],
          ['totalBusinesses', 'Long', '총 사업장 수'],
        ],
        [2400, 1600, 4560]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 9. 불일치 / 미구현 ══════════
      heading1('9. 프론트 ↔ 백엔드 불일치 사항'),
      para('현재 코드 분석 기준 불일치 항목 정리. 연동 전 반드시 확인 및 조율 필요.', { color: COLORS.danger, bold: true }),
      spacer(),

      heading2('9.1 API 경로 불일치'),
      makeTable(
        ['기능', '프론트 호출 경로', '백엔드 실제 경로', '조치'],
        [
          ['공고 분석', 'POST /analyze/job-post', 'POST /api/job-postings/analyze', '프론트 수정 필요'],
          ['계약서 분석', 'POST /analyze/contract', 'POST /api/contracts/analyze', '프론트 수정 필요'],
          ['로그인', 'POST /auth/login', 'POST /api/auth/login', 'baseURL /api 포함 여부 확인'],
          ['회원가입', 'POST /auth/signup', 'POST /api/auth/signup', 'baseURL /api 포함 여부 확인'],
        ],
        [2000, 2400, 2600, 1560]
      ),
      spacer(),

      heading2('9.2 응답 구조 불일치'),
      makeTable(
        ['기능', '프론트 기대 필드', '백엔드 실제 필드', '조치'],
        [
          ['공고 분석 - 사업장명', 'workplace_name', 'extracted.businessName', '프론트 매퍼 수정'],
          ['공고 분석 - 문제 목록', 'issues[].level', 'concerns[].severity', '값 형식 협의 필요'],
          ['공고 분석 - 체불 건수', 'wage_delinquency_count', 'externalChecks 내 포함', '구조 협의 필요'],
          ['계약서 - 계약 기간 종료', 'contract_period.end', '없음', '백엔드 추가 필요'],
          ['계약서 - 조항별 텍스트', 'text_segments[].issue_id', '없음', '백엔드 추가 필요'],
        ],
        [1800, 2200, 2400, 2160]
      ),
      spacer(),

      heading2('9.3 백엔드 미구현 (프론트에서 호출 중)'),
      makeTable(
        ['프론트 호출', '설명', '우선순위'],
        [
          ['GET /mentors/recommended', '멘토 추천 목록', '높음'],
          ['GET /mentors/{id}', '멘토 상세 조회', '높음'],
          ['POST /escrow-orders', '에스크로 결제 생성', '중간'],
        ],
        [2800, 3400, 1560]
      ),
      spacer(),

      heading2('9.4 백엔드 구현 완료 but 프론트 미연결'),
      makeTable(
        ['엔드포인트', '설명', '활용 가능 기능'],
        [
          ['GET /api/working/total-minutes/{id}', '총 근무시간 조회', '대시보드 통계'],
          ['DELETE /api/part-time-jobs/{id}', '알바 삭제', '알바 관리 화면'],
          ['PUT /api/auth/fcm-token', 'FCM 토큰 갱신', '푸시 알림'],
          ['GET /api/reports/wage-calc', '임금 자동 계산', '신고 마법사'],
          ['GET /api/contracts/{id}', '계약서 단건 조회', '계약서 상세'],
        ],
        [3000, 2200, 3360]
      ),
      spacer(),

      heading2('9.5 출퇴근 API 인증 정책 확인 필요'),
      new Paragraph({
        children: [new TextRun({ text: '현재 /api/working/** 엔드포인트는 인증이 불필요하게 설정되어 있습니다. 의도한 설계인지 확인 필요.', size: 20, font: 'Arial', color: COLORS.warning })],
        spacing: { after: 80 },
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════ 10. 전체 목록 ══════════
      heading1('10. API 전체 목록'),
      makeTable(
        ['#', 'Method', '경로', '인증', '설명'],
        [
          ['1', 'POST', '/api/auth/signup', 'N', '회원가입'],
          ['2', 'POST', '/api/auth/login', 'N', '로그인'],
          ['3', 'GET', '/api/auth/me', 'Y', '내 정보 조회'],
          ['4', 'PUT', '/api/auth/fcm-token', 'Y', 'FCM 토큰 업데이트'],
          ['5', 'POST', '/api/part-time-jobs', 'Y', '알바 등록'],
          ['6', 'GET', '/api/part-time-jobs', 'Y', '알바 목록 조회'],
          ['7', 'DELETE', '/api/part-time-jobs/{id}', 'Y', '알바 삭제'],
          ['8', 'POST', '/api/working/bssid/{id}', 'N', 'WiFi BSSID 등록'],
          ['9', 'POST', '/api/working/clock-in', 'N', '출근 처리'],
          ['10', 'POST', '/api/working/clock-out', 'N', '퇴근 처리'],
          ['11', 'GET', '/api/working/current/{id}', 'N', '현재 출근 상태'],
          ['12', 'GET', '/api/working/history/{id}', 'N', '출퇴근 이력'],
          ['13', 'GET', '/api/working/total-minutes/{id}', 'N', '총 근무시간'],
          ['14', 'POST', '/api/contracts/analyze', 'Y', '계약서 이미지 분석'],
          ['15', 'GET', '/api/contracts', 'Y', '계약서 분석 이력'],
          ['16', 'GET', '/api/contracts/{contractId}', 'Y', '계약서 단건 조회'],
          ['17', 'POST', '/api/job-postings/analyze', 'N', '구인공고 분석'],
          ['18', 'GET', '/api/job-postings/analyses/{id}', 'N', '공고 분석 결과 조회'],
          ['19', 'POST', '/api/reports', 'Y', '임금체불 신고 생성'],
          ['20', 'GET', '/api/reports', 'Y', '신고 목록 조회'],
          ['21', 'GET', '/api/reports/{reportId}', 'Y', '신고 상세 조회'],
          ['22', 'POST', '/api/reports/{reportId}/complaint-draft', 'Y', '진정서 생성'],
          ['23', 'GET', '/api/reports/wage-calc', 'Y', '임금 계산'],
          ['24', 'GET', '/api/health', 'N', '서버 상태 확인'],
          ['25', 'POST', '/api/admin/businesses/import-local-data', 'N', '사업장 데이터 임포트'],
        ],
        [500, 900, 3800, 700, 2660]
      ),

    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('안심알바_API_명세서_v1.0.docx', buf);
  console.log('완료: docs/안심알바_API_명세서_v1.0.docx');
});
