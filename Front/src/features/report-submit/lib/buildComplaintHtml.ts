import type { ReportCase } from "@/entities/report";

export type NegotiationStatus = "refused" | "not-tried" | "no-response";

export interface ComplaintBreakdown {
  base: number;
  weekly: number;
  overtime: number;
  night: number;
}

export interface ReportDraft {
  damageTypes: string[];
  workPeriod: { start: string; end: string };
  unpaidBreakdown: ComplaintBreakdown;
  unpaidAmount: number;
  employerNegotiation: NegotiationStatus;
}

const NEGOTIATION_TEXT: Record<NegotiationStatus, string> = {
  refused:
    "진정인은 사업주에게 임금 지급을 요청하였으나 사업주가 이를 거부하였습니다.",
  "not-tried":
    "진정인은 아직 사업주에게 임금 지급 요청을 하지 않았습니다.",
  "no-response":
    "진정인은 사업주에게 수차례 연락을 시도하였으나 응답이 없었습니다.",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 진정서 HTML 생성 — expo-print.printToFileAsync()에 전달.
 * reportCase에 사용자 인적사항/사업장 주소가 없으면 자리표시자로 채움.
 *
 * customBody가 주어지면 구조화 마크업 대신 사용자가 직접 편집한 plain text를
 * <pre> 안에 넣어 그대로 렌더 — 사용자 편집 내용을 보존.
 */
export function buildComplaintHtml(
  draft: ReportDraft,
  reportCase: ReportCase,
  customBody?: string,
): string {
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
  const negotiationText = NEGOTIATION_TEXT[draft.employerNegotiation];

  const breakdown = [
    draft.unpaidBreakdown.base > 0
      ? `기본 임금: ₩${draft.unpaidBreakdown.base.toLocaleString()}`
      : null,
    draft.unpaidBreakdown.weekly > 0
      ? `주휴수당: ₩${draft.unpaidBreakdown.weekly.toLocaleString()} (근로기준법 제55조)`
      : null,
    draft.unpaidBreakdown.overtime > 0
      ? `연장근로수당: ₩${draft.unpaidBreakdown.overtime.toLocaleString()} (근로기준법 제56조)`
      : null,
    draft.unpaidBreakdown.night > 0
      ? `야간근로수당: ₩${draft.unpaidBreakdown.night.toLocaleString()}`
      : null,
  ]
    .filter((s): s is string => s !== null)
    .join("<br/>");

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
  td:first-child { width: 100px; font-weight: bold; color: #444; }
  .section { margin-top: 24px; }
  .section-title { font-weight: bold; border-bottom: 1px solid #ccc;
                   padding-bottom: 4px; margin-bottom: 8px; }
  .indent { margin-left: 20px; }
  .total { font-weight: bold; font-size: 15px; }
  .sign { margin-top: 40px; text-align: right; }
  .footer { margin-top: 32px; font-size: 12px; color: #555; }
</style>
</head>
<body>
<h1>진    정    서</h1>

<table>
  <tr><td>진정인</td><td>[성명] ([연락처])</td></tr>
  <tr><td>피진정인</td>
      <td>${escapeHtml(reportCase.workplaceName)}<br/>
          주소: [사업장 주소]</td></tr>
</table>

<div class="section">
  <div class="section-title">진정 취지</div>
  <p>진정인은 피진정인이 운영하는 사업장에서
  ${escapeHtml(draft.workPeriod.start)}부터 ${escapeHtml(draft.workPeriod.end)}까지 근로한 사실이 있으며,
  근로기준법 제43조에 따라 지급받아야 할 임금
  총 <strong>₩${draft.unpaidAmount.toLocaleString()}원</strong>을
  지급받지 못하여 진정을 제기합니다.</p>
</div>

<div class="section">
  <div class="section-title">진정 사유</div>
  <p><strong>1. 미지급 항목 및 금액</strong></p>
  <div class="indent">
    ${breakdown}<br/>
    <span class="total">합계: ₩${draft.unpaidAmount.toLocaleString()}</span>
  </div>
  <p><strong>2. 협의 시도 여부</strong></p>
  <div class="indent">${negotiationText}</div>
</div>

<div class="section">
  <div class="section-title">증거 자료</div>
  <div class="indent">
    - 근로계약서 (${reportCase.evidence.contracts}건)<br/>
    - 출퇴근 기록 (앱 자동 수집, ${reportCase.evidence.workLogs}건)<br/>
    - 급여명세서 (${reportCase.evidence.paystubs}건)<br/>
    - 통장 거래내역 (${reportCase.evidence.bankRecords}건)
  </div>
</div>

<div class="sign">
  <p>위와 같이 진정합니다.</p>
  <p>${today}</p>
  <p>진정인: [성명] (서명)</p>
</div>

<div class="footer">
  관할 고용노동청 귀하
</div>
</body>
</html>`;
}
