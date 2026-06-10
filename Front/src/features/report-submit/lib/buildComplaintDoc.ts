import type {
  BusinessType,
  ContractMethod,
  EmploymentStatusEnum,
} from "@/entities/report";

/**
 * 진정서 미리보기 화면에서 사용자가 직접 수정하는 편집 폼 데이터.
 * 1. 진정인 / 2. 피진정인 / 3. 진정 내용 항목과 1:1로 대응한다.
 * 금액 항목은 사용자가 자유롭게 편집할 수 있도록 문자열로 보관한다.
 */
export interface ComplaintFormData {
  // 1. 진정인
  applicantName: string;
  applicantRrn: string;
  applicantAddress: string;
  applicantPhone: string;
  applicantMobile: string;
  applicantEmail: string;
  wantsResultNotice: boolean | null;
  wantsLaborOfficeNotice: boolean | null;

  // 2. 피진정인
  respondentName: string;
  respondentPhone: string;
  respondentAddress: string;
  businessType: BusinessType | null;
  workplaceName: string;
  workplaceAddress: string;
  workplacePhone: string;
  employeeCount: string;

  // 3. 진정 내용
  employmentStartDate: string;
  employmentEndDate: string;
  totalUnpaidWage: string;
  employmentStatus: EmploymentStatusEnum | null;
  unpaidSeverance: string;
  otherUnpaid: string;
  jobDescription: string;
  wagePaymentDate: string;
  contractMethod: ContractMethod | null;
  /** AI(Gemini)가 생성한 뒤 사용자가 수정 가능한 진정 내용 본문. */
  content: string;
  /** 첨부 파일명 목록(줄바꿈 구분). */
  attachments: string;

  /** 관할 고용노동(지)청명. */
  laborOffice: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 줄바꿈을 <br/>로 보존하며 escape. */
function multiline(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br/>");
}

/** ■ / □ 체크박스 표기. */
function chk(on: boolean, label: string): string {
  return `${on ? "■" : "☐"} ${escapeHtml(label)}`;
}

/**
 * 사용자가 수정한 진정서 폼 데이터를 .doc(Word 호환 HTML) 문자열로 변환한다.
 * 첨부된 진정서 공식 양식(고용노동부 표 레이아웃)을 그대로 따른다.
 */
export function buildComplaintDoc(form: ComplaintFormData): string {
  const body = `
    <h1>진정서</h1>

    <h2>1. 진정인</h2>
    <table>
      <tbody>
        <tr>
          <th>성 명</th><td>${escapeHtml(form.applicantName)}</td>
          <th>주민등록번호</th><td>${escapeHtml(form.applicantRrn)}</td>
        </tr>
        <tr>
          <th>주 소</th><td colspan="3">${escapeHtml(form.applicantAddress)}</td>
        </tr>
        <tr>
          <th>전화번호</th><td>${escapeHtml(form.applicantPhone)}</td>
          <th>휴대전화번호</th><td>${escapeHtml(form.applicantMobile)}</td>
        </tr>
        <tr>
          <th>전자우편주소</th><td colspan="3">${escapeHtml(form.applicantEmail)}</td>
        </tr>
        <tr>
          <th>처리 상황 수신여부</th>
          <td>${chk(form.wantsResultNotice === true, "예")} &nbsp;&nbsp; ${chk(form.wantsResultNotice === false, "아니오")}</td>
          <th>노동포털 통지여부</th>
          <td>${chk(form.wantsLaborOfficeNotice === true, "예")} &nbsp;&nbsp; ${chk(form.wantsLaborOfficeNotice === false, "아니오")}</td>
        </tr>
      </tbody>
    </table>

    <h2>2. 피진정인</h2>
    <table>
      <tbody>
        <tr>
          <th>성 명</th><td>${escapeHtml(form.respondentName)}</td>
          <th>연락처</th><td>${escapeHtml(form.respondentPhone)}</td>
        </tr>
        <tr>
          <th>주 소</th><td colspan="3">${escapeHtml(form.respondentAddress)}</td>
        </tr>
        <tr>
          <th>사업체 구분</th>
          <td colspan="3">${chk(form.businessType === "WORKPLACE", "사업장")} &nbsp;&nbsp; ${chk(form.businessType === "CONSTRUCTION_SITE", "공사현장")}</td>
        </tr>
        <tr>
          <th>사업장명</th><td colspan="3">${escapeHtml(form.workplaceName)}</td>
        </tr>
        <tr>
          <th>사업장 주소<br>(실근무장소)</th><td colspan="3">${escapeHtml(form.workplaceAddress)}</td>
        </tr>
        <tr>
          <th>사업장전화번호</th><td>${escapeHtml(form.workplacePhone)}</td>
          <th>근로자 수</th><td>${escapeHtml(form.employeeCount)}</td>
        </tr>
      </tbody>
    </table>

    <h2>3. 진정 내용</h2>
    <table>
      <tbody>
        <tr>
          <th>입사일</th><td>${escapeHtml(form.employmentStartDate)}</td>
          <th>퇴사일</th><td>${escapeHtml(form.employmentEndDate)}</td>
        </tr>
        <tr>
          <th>체불임금총액</th><td>${escapeHtml(form.totalUnpaidWage)}</td>
          <th>퇴직 여부</th>
          <td>${chk(form.employmentStatus === "FORMER", "퇴직")} &nbsp;&nbsp; ${chk(form.employmentStatus === "CURRENT", "재직")}</td>
        </tr>
        <tr>
          <th>체불퇴직금액</th><td>${escapeHtml(form.unpaidSeverance)}</td>
          <th>기타체불금액</th><td>${escapeHtml(form.otherUnpaid)}</td>
        </tr>
        <tr>
          <th>업무내용</th><td colspan="3">${escapeHtml(form.jobDescription)}</td>
        </tr>
        <tr>
          <th>임금 지급일</th><td>${escapeHtml(form.wagePaymentDate)}</td>
          <th>근로계약방법</th>
          <td>${chk(form.contractMethod === "WRITTEN", "서면")} &nbsp;&nbsp; ${chk(form.contractMethod === "ORAL", "구두")}</td>
        </tr>
        <tr>
          <th>내 용</th>
          <td colspan="3" class="content-row">${multiline(form.content)}</td>
        </tr>
        <tr>
          <th>파일첨부</th><td colspan="3">${multiline(form.attachments)}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      ( ${escapeHtml(form.laborOffice)} ) 고용노동(지)청장 귀하
    </div>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>진정서</title>
<style>
    body {
        font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
        line-height: 1.6;
        margin: 40px auto;
        max-width: 800px;
        color: #333;
    }
    h1 {
        text-align: center;
        font-size: 2.2em;
        margin-bottom: 40px;
        letter-spacing: 5px;
    }
    h2 {
        font-size: 1.2em;
        margin-top: 30px;
        margin-bottom: 10px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 25px;
        table-layout: fixed;
    }
    th, td {
        border: 1px solid #000;
        padding: 12px;
        font-size: 14px;
        vertical-align: middle;
    }
    th {
        background-color: #f4f4f4;
        text-align: center;
        width: 20%;
        font-weight: 600;
    }
    td {
        text-align: left;
        word-wrap: break-word;
    }
    .footer {
        text-align: right;
        margin-top: 60px;
        font-size: 1.3em;
        font-weight: bold;
    }
    .content-row {
        height: 200px;
        vertical-align: top;
    }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
