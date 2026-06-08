import type {
  ApplicantInfo,
  ComplaintFacts,
  ComplaintRespondent,
  DamageTypeEnum,
  ReportCase,
} from "@/entities/report";

export type NegotiationStatus = "refused" | "not-tried" | "no-response";

const NEGOTIATION_TEXT: Record<NegotiationStatus, string> = {
  refused:
    "진정인은 사업주에게 임금 지급을 요청하였으나 사업주가 이를 거부하였습니다.",
  "not-tried":
    "진정인은 아직 사업주에게 임금 지급 요청을 하지 않았습니다.",
  "no-response":
    "진정인은 사업주에게 수차례 연락을 시도하였으나 응답이 없었습니다.",
};

const DAMAGE_LABEL: Record<DamageTypeEnum, string> = {
  BASE_WAGE: "기본 임금 미지급",
  WEEKLY_HOLIDAY: "주휴수당 미지급",
  OVERTIME: "연장근로수당 미지급",
  NIGHT: "야간근로수당 미지급",
  SEVERANCE: "퇴직금 미지급",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function val(v: string | null | undefined): string {
  if (v === null || v === undefined || v.length === 0) return "";
  return escapeHtml(v);
}

function moneyVal(v: number | null | undefined): string {
  if (v === null || v === undefined || v === 0) return "";
  return `${v.toLocaleString()}원`;
}

/** ☑ / ☐ 체크박스 — 공식 폼의 □/■ 표기를 위해 사용. */
function chk(on: boolean, label: string): string {
  return `<span class="cb">${on ? "■" : "□"}</span> ${escapeHtml(label)}`;
}

export interface BuildComplaintParams {
  reportCase: ReportCase;
  negotiation: NegotiationStatus;
  applicant?: ApplicantInfo | null;
  /** 사용자가 직접 편집한 plain text 본문. 있으면 구조화 폼 대신 그대로 사용. */
  customBody?: string;
}

/**
 * 진정서 HTML 생성 — 고용노동부 공식 진정서 폼 레이아웃.
 *   - 1. 진정인 / 2. 피진정인 / 3. 진정 내용 (모두 표 형식)
 *   - 처리상황 수신여부 / 노동포털 통지여부 / 사업체 구분 / 퇴직 여부 / 근로계약방법 → 체크박스
 *   - applicant null이면 진정인 칸은 빈칸으로 (사용자가 출력 후 손글씨로 채울 수 있도록)
 *   - customBody가 있으면 표 대신 plain pre 렌더 (전체 자유 편집 모드).
 */
export function buildComplaintHtml(params: BuildComplaintParams): string {
  const { reportCase, negotiation, applicant, customBody } = params;

  // 자유 편집 모드 — 사용자가 텍스트로 전체를 다시 쓴 경우
  if (customBody !== undefined && customBody.trim().length > 0) {
    return wrapHtml(
      `<h1>진　정　서</h1>
       <pre class="custom-body">${escapeHtml(customBody)}</pre>
       <div class="footer">(　　　　)고용노동(지)청장 귀하</div>`,
    );
  }

  const respondent: ComplaintRespondent | undefined = reportCase.respondent;
  const facts: ComplaintFacts | undefined = reportCase.facts;
  const negotiationText = NEGOTIATION_TEXT[negotiation];

  // 1. 진정인 — applicant 없으면 모두 빈칸
  const applicantBlock = `
    <table class="form-tbl">
      <tr>
        <th class="lbl">성　　명</th><td class="val">${val(applicant?.fullName)}</td>
        <th class="lbl">주민등록번호</th><td class="val">${val(applicant?.rrn)}</td>
      </tr>
      <tr>
        <th class="lbl">주　　소</th><td class="val" colspan="3">${val(applicant?.address)}</td>
      </tr>
      <tr>
        <th class="lbl">전 화 번 호</th><td class="val">${val(applicant?.phone)}</td>
        <th class="lbl">휴대전화번호</th><td class="val">${val(applicant?.mobile)}</td>
      </tr>
      <tr>
        <th class="lbl">전자우편주소</th><td class="val" colspan="3">${val(applicant?.email)}</td>
      </tr>
      <tr>
        <th class="lbl">처리상황 수신여부</th>
        <td class="val">${chk(applicant?.wantsResultNotice === true, "예")}　${chk(applicant?.wantsResultNotice === false, "아니오")}</td>
        <th class="lbl">노동포털 통지여부</th>
        <td class="val">${chk(applicant?.wantsLaborOfficeNotice === true, "예")}　${chk(applicant?.wantsLaborOfficeNotice === false, "아니오")}</td>
      </tr>
    </table>`;

  // 2. 피진정인
  const businessTypeWorkplace = respondent?.businessType === "WORKPLACE";
  const businessTypeConstruction =
    respondent?.businessType === "CONSTRUCTION_SITE";
  const respondentBlock = `
    <table class="form-tbl">
      <tr>
        <th class="lbl">성　　명</th><td class="val">${val(respondent?.representativeName)}</td>
        <th class="lbl">연 락 처</th><td class="val">${val(respondent?.phone)}</td>
      </tr>
      <tr>
        <th class="lbl">주　　소</th>
        <td class="val" colspan="3">${val(respondent?.address)}</td>
      </tr>
      <tr>
        <th class="lbl">사업체 구분</th>
        <td class="val" colspan="3">
          ${chk(businessTypeWorkplace, "사업장")}　${chk(businessTypeConstruction, "공사현장")}
        </td>
      </tr>
      <tr>
        <th class="lbl">사 업 장 명</th>
        <td class="val" colspan="3">${val(respondent?.workplaceName ?? reportCase.workplaceName)}</td>
      </tr>
      <tr>
        <th class="lbl">사업장 주소<br/><span class="sub">(실근무장소)</span></th>
        <td class="val" colspan="3">${val(respondent?.address)}</td>
      </tr>
      <tr>
        <th class="lbl">사업장전화번호</th>
        <td class="val">${val(respondent?.workplacePhone)}</td>
        <th class="lbl">근 로 자 수</th>
        <td class="val">${respondent?.employeeCount !== null && respondent?.employeeCount !== undefined ? `${respondent.employeeCount}명` : ""}</td>
      </tr>
    </table>`;

  // 3. 진정 내용
  const isFormer = facts?.employmentStatus === "FORMER";
  const isCurrent = facts?.employmentStatus === "CURRENT";
  const isWritten = facts?.contractMethod === "WRITTEN";
  const isOral = facts?.contractMethod === "ORAL";

  // 내용 — 피해 유형 / 자유 서술 / 협의 시도를 한 칸에 결합
  const damageEnums = reportCase.damageTypeEnums ?? [];
  const damageList =
    damageEnums.length > 0
      ? damageEnums.map((d) => `· ${escapeHtml(DAMAGE_LABEL[d])}`).join("<br/>")
      : "· 임금체불";
  const freeForm = reportCase.freeFormDescription ?? "";
  const contentCell = `
    <div class="content-block">
      <div class="content-label">[피해 유형]</div>
      <div class="content-body">${damageList}</div>

      <div class="content-label">[상황 설명]</div>
      <div class="content-body free-form">${escapeHtml(freeForm.length > 0 ? freeForm : "")}</div>

      <div class="content-label">[협의 시도 여부]</div>
      <div class="content-body">${escapeHtml(negotiationText)}</div>
    </div>`;

  // 파일 첨부 — 자동 수집된 증거 파일 이름 리스트
  const files = reportCase.evidenceFiles ?? [];
  const fileList =
    files.length > 0
      ? files.map((f, i) => `${i + 1}. ${escapeHtml(f.name)}`).join("<br/>")
      : "";

  const factsBlock = `
    <table class="form-tbl">
      <tr>
        <th class="lbl">입 사 일</th><td class="val">${val(facts?.employmentStartDate)}</td>
        <th class="lbl">퇴 사 일</th><td class="val">${val(facts?.employmentEndDate)}</td>
      </tr>
      <tr>
        <th class="lbl">체불임금총액</th><td class="val">${moneyVal(facts?.totalUnpaidWage)}</td>
        <th class="lbl">퇴직 여부</th>
        <td class="val">${chk(isFormer, "퇴직")}　${chk(isCurrent, "재직")}</td>
      </tr>
      <tr>
        <th class="lbl">체불퇴직금액</th><td class="val">${moneyVal(facts?.unpaidSeverance)}</td>
        <th class="lbl">기타체불금액</th><td class="val">${moneyVal(facts?.otherUnpaid)}</td>
      </tr>
      <tr>
        <th class="lbl">업 무 내 용</th>
        <td class="val" colspan="3">${val(facts?.jobDescription)}</td>
      </tr>
      <tr>
        <th class="lbl">임금 지급일</th><td class="val">${val(facts?.wagePaymentDate)}</td>
        <th class="lbl">근로계약방법</th>
        <td class="val">${chk(isWritten, "서면")}　${chk(isOral, "구두")}</td>
      </tr>
      <tr>
        <th class="lbl content-th">내　　용</th>
        <td class="val content-td" colspan="3">${contentCell}</td>
      </tr>
      <tr>
        <th class="lbl file-th">파 일 첨 부</th>
        <td class="val file-td" colspan="3">${fileList}</td>
      </tr>
    </table>`;

  const laborOffice = reportCase.business?.laborOffice ?? "";

  const body = `
    <h1>진　정　서</h1>

    <h2>1. 진정인</h2>
    ${applicantBlock}

    <h2>2. 피진정인</h2>
    ${respondentBlock}

    <h2>3. 진정 내용</h2>
    ${factsBlock}

    <div class="footer">
      (　${escapeHtml(laborOffice)}　)고용노동(지)청장 귀하
    </div>`;

  return wrapHtml(body);
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
    font-size: 11.5px;
    line-height: 1.55;
    color: #111;
    margin: 0;
  }
  h1 {
    text-align: center;
    font-size: 22px;
    letter-spacing: 14px;
    font-weight: 700;
    margin: 0 0 24px 0;
  }
  h2 {
    font-size: 13.5px;
    font-weight: 700;
    margin: 18px 0 6px 0;
    padding-bottom: 2px;
  }
  .form-tbl {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 8px;
  }
  .form-tbl th,
  .form-tbl td {
    border: 1px solid #222;
    padding: 6px 8px;
    vertical-align: middle;
    font-size: 11px;
  }
  .lbl {
    background: #F4F5F7;
    width: 18%;
    font-weight: 500;
    text-align: center;
    color: #222;
  }
  .val {
    background: #FFFFFF;
    width: 32%;
    text-align: left;
  }
  .sub { font-size: 10px; color: #555; font-weight: 400; }
  .cb { font-size: 12px; }
  .content-th, .content-td { vertical-align: top; }
  .content-td { padding: 8px 10px; min-height: 140px; }
  .content-block { min-height: 130px; }
  .content-label {
    font-weight: 700;
    color: #333;
    margin-top: 6px;
    margin-bottom: 2px;
    font-size: 11px;
  }
  .content-body {
    margin-left: 6px;
    margin-bottom: 6px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .free-form { min-height: 36px; }
  .file-th, .file-td { vertical-align: top; }
  .file-td { min-height: 42px; }
  .footer {
    text-align: center;
    margin-top: 36px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 2px;
  }
  pre.custom-body {
    font-family: inherit;
    font-size: 12px;
    line-height: 1.8;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0 0 24px 0;
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
