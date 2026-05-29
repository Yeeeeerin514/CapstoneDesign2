package com.albasave.albasave_server.lawapi.dto;

/**
 * 법령 외 보조 데이터 (판례/법령해석례) 단일 문서.
 *
 * sourceType:
 *  - "PRECEDENT": 대법원/하급심 판례
 *  - "INTERPRETATION": 정부 법령해석례 (법무부·고용노동부 등)
 */
public record LawDocument(
        String sourceType,
        String externalId,    // 판례일련번호 / 법령해석례일련번호
        String title,         // 사건명 / 안건명
        String issuer,        // 법원명 / 회신기관명
        String date,          // 선고일자(yyyyMMdd) / 회신일자
        String referenceLaw,  // 참조조문 (판례)
        String summary,       // 판시사항+판결요지 / 질의요지
        String body           // 판례내용 / 이유
) {
    public String header() {
        StringBuilder sb = new StringBuilder();
        if ("PRECEDENT".equals(sourceType)) sb.append("[판례] ");
        else if ("INTERPRETATION".equals(sourceType)) sb.append("[해석례] ");
        if (issuer != null && !issuer.isBlank()) sb.append(issuer).append(' ');
        if (date != null && date.length() == 8) {
            sb.append(date.substring(0, 4)).append('.').append(date.substring(4, 6)).append('.').append(date.substring(6, 8)).append(' ');
        } else if (date != null && !date.isBlank()) {
            sb.append(date).append(' ');
        }
        if (title != null && !title.isBlank()) sb.append("— ").append(title);
        return sb.toString().trim();
    }
}
