import { claudeClient } from "@/shared/api/axios-instance";
import type { ContractAnalysis } from "../model/types";

const SYSTEM_PROMPT = `당신은 한국 근로기준법 전문가입니다.
업로드된 근로계약서 이미지를 분석하고 아래 항목을 점검해 JSON으로만 응답하세요.

점검 항목:
1) 최저임금 준수 (2026년 10,030원/시 기준)
2) 주휴수당 명시 여부
3) 연장수당(8시간 초과 1.5배) 규정
4) 4대보험 기재 여부
5) 근로시간(소정/연장) 명확성
6) 사업장명·사업자등록번호 표기 여부

응답 JSON 스키마:
{
  "contractId": "string (임시값 ok)",
  "workplaceName": "string",
  "contractPeriod": "string",
  "hourlyWage": number,
  "minimumWage": 10030,
  "issues": [
    {
      "id": "string",
      "severity": "danger" | "caution" | "info",
      "title": "string",
      "description": "string",
      "legalBasis": "string",
      "recommendation": "string"
    }
  ]
}`;

interface ClaudeMessageResponse {
  content: Array<{ type: "text"; text: string }>;
}

/**
 * 근로계약서 이미지(Base64)를 받아 Claude로 분석.
 * - 응답 텍스트는 ```json ``` 펜스가 붙어올 수 있어 제거 후 parse.
 */
export async function analyzeContract(
  imageBase64: string,
): Promise<ContractAnalysis> {
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
          {
            type: "text",
            text: "이 근로계약서를 분석해 위 스키마에 맞춰 JSON으로만 응답하세요.",
          },
        ],
      },
    ],
  });
  const text = data.content[0]?.text ?? "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as ContractAnalysis;
}
