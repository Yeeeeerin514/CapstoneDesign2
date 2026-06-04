package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.ReportSource;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * 신고 draft 생성 요청.
 *
 * 요청 본문의 "source" 값에 따라 실제 역직렬화되는 구체 타입이 달라진다(다형성).
 *   - "search"     → {@link SearchReportDraftRequest}
 *   - "registered" → {@link RegisteredReportDraftRequest}
 *   - "manual"     → {@link ManualReportDraftRequest}
 *
 * 각 구체 타입은 자신만의 방식으로 {@link #resolve(PartTimeJobLookup)}를 구현해
 * 공통 결과({@link ReportDraftSpec})를 만들어낸다 → 서비스는 source 분기 없이 동작.
 */
@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.PROPERTY,
        property = "source"
)
@JsonSubTypes({
        @JsonSubTypes.Type(value = SearchReportDraftRequest.class, name = "search"),
        @JsonSubTypes.Type(value = RegisteredReportDraftRequest.class, name = "registered"),
        @JsonSubTypes.Type(value = ManualReportDraftRequest.class, name = "manual"),
})
public abstract class CreateReportDraftRequest {

    /** 이 요청의 생성 경로. 구체 타입마다 고정값. */
    public abstract ReportSource getSource();

    /** 요청을 공통 스펙으로 해석. registered는 lookup으로 PartTimeJob을 조회한다. */
    public abstract ReportDraftSpec resolve(PartTimeJobLookup lookup);
}
