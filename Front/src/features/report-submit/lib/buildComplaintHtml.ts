import type {
  ApplicantInfo,
  ComplaintFacts,
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

const DAMAGE_LABEL: Record<string, string> = {
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

function fmtMoney(v: number | null): string {
  if (v === null || v === 0) return "-";
  return `₩${v.toLocaleString()}`;
}

function fmtDate(value: string | null): string {
  if (value === null || value.length === 0) return "-";
  return value;
}

function buildFactsBlock(facts: ComplaintFacts | undefined): string {
  if (facts === undefined) return "";
  const rows: Array<[string, string]> = [
    ["입사일", fmtDate(facts.employmentStartDate)],
    facts.employmentStatus === "FORMER"
      ? ["퇴사일", fmtDate(facts.employmentEndDate)]
      : ["재직 상태", facts.employmentStatus === "CURRENT" ? "재직 중" : "-"],
    ["체불임금 총액", fmtMoney(facts.totalUnpaidWage)],
  ];
  if (facts.employmentStatus === "FORMER") {
    rows.push(["체불 퇴직금", fmtMoney(facts.unpaidSeverance)]);
  }
  if (facts.otherUnpaid !== null && facts.otherUnpaid > 0) {
    rows.push(["기타 체불금", fmtMoney(facts.otherUnpaid)]);
  }
  if (facts.jobDescription !== null && facts.jobDescription.length > 0) {
    rows.push(["업무 내용", facts.jobDescription]);
  }
  if (facts.wagePaymentDate !== null && facts.wagePaymentDate.length > 0) {
    rows.push(["임금 지급일", facts.wagePaymentDate]);
  }
  if (facts.contractMethod !== null) {
    rows.push([
      "근로계약 방법",
      facts.contractMethod === "WRITTEN" ? "서면" : "구두",
    ]);
  }
  return rows
    .map(
      ([k, v]) =>
        `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`,
    )
    .join("");
}

export interface BuildComplaintParams {
  reportCase: ReportCase;
  negotiation: NegotiationStatus;
  applicant?: ApplicantInfo | null;
  /** 사용자가 직접 편집한 plain text 본문. 있으면 구조화 마크업 대신 그대로 사용. */
  customBody?: string;
}

/**
 * 진정서 HTML 생성 — V2 (reportCase.respondent / facts / freeFormDescription / damageTypeEnums 소비).
 *   - applicant가 없으면 진정인 정보는 자리표시자로 렌더.
 *   - customBody 우선 (사용자 편집 본문 보존용).
 */
export function buildComplaintHtml(params: BuildComplaintParams): string {
  const { reportCase, negotiation, applicant, customBody } = params;

  if (customBody !== undefined && customBody.trim().length > 0) {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 13px;
         line-height: 1.8; margin: 40px; color: #111; }
  h1 { text-align: center; font-size: 20px; letter-spacing: 8px;
       margin-bottom: 32px; }
  pre { font-family: inherit; font-size: inherit; line-height: inherit;
        white-space: pre-wrap; word-wrap: break-word; margin: 0; }
</style>
</head>
<body>
<h1>진    정    서</h1>
<pre>${escapeHtml(customBody)}</pre>
</body>
</html>`;
  }

  const today = new Date().toLocaleDateString("ko-KR");
  const negotiationText = NEGOTIATION_TEXT[negotiation];

  const applicantName = applicant?.fullName ?? "[성명]";
  const applicantPhone = applicant?.phone ?? applicant?.mobile ?? "[연락처]";
  const applicantAddress = applicant?.address ?? "[주소]";

  const respondent = reportCase.respondent;
  const respondentRep = respondent?.representativeName ?? "[사업주명]";
  const respondentPhone = respondent?.phone ?? "[사업주 연락처]";
  const respondentAddress = respondent?.address ?? "[사업장 주소]";
  const employeeCount =
    respondent?.employeeCount !== null && respondent?.employeeCount !== undefined
      ? `${respondent.employeeCount}명`
      : "-";

  const damageEnums = reportCase.damageTypeEnums ?? [];
  const damageList =
    damageEnums.length > 0
      ? damageEnums
          .map((d) => `- ${escapeHtml(DAMAGE_LABEL[d] ?? d)}`)
          .join("<br/>")
      : "- 임금체불";

  const total = reportCase.facts?.totalUnpaidWage ?? 0;
  const freeForm = reportCase.freeFormDescription ?? "";

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 13px;
         line-height: 1.8; margin: 40px; color: #111; }
  h1 { text-align: center; font-size: 20px; letter-spacing: 8px;
       margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  td { padding: 6px 8px; vertical-align: top; }
  td:first-child { width: 110px; font-weight: bold; color: #444; }
  .section { margin-top: 24px; }
  .section-title { font-weight: bold; border-bottom: 1px solid #ccc;
                   padding-bottom: 4px; margin-bottom: 8px; }
  .indent { margin-left: 20px; }
  .total { font-weight: bold; font-size: 15px; }
  .sign { margin-top: 40px; text-align: right; }
  .footer { margin-top: 32px; font-size: 12px; color: #555; }
  .free-form { white-space: pre-wrap; word-wrap: break-word; margin-left: 20px; }
</style>
</head>
<body>
<h1>진    정    서</h1>

<table>
  <tr><td>1. 진정인</td>
      <td>성명: ${escapeHtml(applicantName)}<br/>
          연락처: ${escapeHtml(applicantPhone)}<br/>
          주소: ${escapeHtml(applicantAddress)}</td></tr>
  <tr><td>2. 피진정인</td>
      <td>사업장명: ${escapeHtml(reportCase.workplaceName)}<br/>
          대표자: ${escapeHtml(respondentRep)}<br/>
          연락처: ${escapeHtml(respondentPhone)}<br/>
          주소: ${escapeHtml(respondentAddress)}<br/>
          근로자 수: ${escapeHtml(employeeCount)}</td></tr>
</table>

<div class="section">
  <div class="section-title">3. 진정 내용</div>

  <table>
    ${buildFactsBlock(reportCase.facts ?? undefined)}
  </table>

  <p><strong>피해 유형</strong></p>
  <div class="indent">${damageList}</div>

  <p style="margin-top: 14px;"><strong>상황 설명</strong></p>
  <div class="free-form">${escapeHtml(freeForm.length > 0 ? freeForm : "(상황 설명 미입력)")}</div>

  <p style="margin-top: 14px;"><strong>체불 임금 총액</strong></p>
  <div class="indent total">${fmtMoney(total)}</div>

  <p style="margin-top: 14px;"><strong>협의 시도 여부</strong></p>
  <div class="indent">${negotiationText}</div>
</div>

<div class="sign">
  <p>위와 같이 진정합니다.</p>
  <p>${today}</p>
  <p>진정인: ${escapeHtml(applicantName)} (서명)</p>
</div>

<div class="footer">
  관할 고용노동청 귀하
</div>
</body>
</html>`;
}
