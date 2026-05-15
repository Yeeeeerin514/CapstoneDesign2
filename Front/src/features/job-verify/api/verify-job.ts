import { claudeClient } from "@/shared/api/axios-instance";
import type { JobVerifyResult } from "../model/types";

const SYSTEM_PROMPT = `당신은 한국 근로기준법 전문가입니다.
사용자가 입력한 알바몬/알바천국 공고를 분석하고 위법 사항을 JSON으로만 응답하세요.

점검 항목:
1) 최저임금 미만 (2026년 10,030원/시 기준)
2) 주휴수당 미명시
3) 연장수당 규정 부재
4) 4대보험 누락
5) 근무시간 모호 ("필요시 연장" 등)
6) 사업장 미상 (상호/주소/사업자번호 미표기)

응답 JSON 스키마:
{
  "workplaceName": string | null,
  "hourlyWage": number | null,
  "hasHolidayAllowance": boolean | null,
  "hasFourMajorInsurances": boolean | null,
  "issues": [
    {
      "id": string,
      "severity": "danger" | "caution" | "info",
      "title": string,
      "description": string,
      "legalBasis": string,
      "recommendation": string
    }
  ]
}`;

interface ClaudeMessageResponse {
  content: Array<{ type: "text"; text: string }>;
}

function parseClaudeJson(data: ClaudeMessageResponse): JobVerifyResult {
  const text = data.content[0]?.text ?? "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as JobVerifyResult;
}

/** URL 입력 분석 — Claude가 URL을 직접 fetch 못하므로 백엔드 스크래핑 결과를 받는 형태가 이상적.
 * MVP에서는 URL 텍스트를 그대로 프롬프트에 포함해 판단을 요청. */
export async function verifyJobByUrl(url: string): Promise<JobVerifyResult> {
  const { data } = await claudeClient.post<ClaudeMessageResponse>("/messages", {
    model: "claude-opus-4-5",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `다음 공고 URL을 분석하세요: ${url}\n위 스키마에 맞춰 JSON으로만 응답하세요.`,
      },
    ],
  });
  return parseClaudeJson(data);
}

/** 캡처 이미지 업로드 분석. */
export async function verifyJobByImage(
  imageBase64: string,
): Promise<JobVerifyResult> {
  const { data } = await claudeClient.post<ClaudeMessageResponse>("/messages", {
    model: "claude-opus-4-5",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageBase64,
            },
          },
          { type: "text", text: "이 공고 캡처를 위 스키마에 맞춰 JSON으로만 응답하세요." },
        ],
      },
    ],
  });
  return parseClaudeJson(data);
}
