package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.report.domain.BusinessSnapshot;
import com.albasave.albasave_server.workinglog.domain.PartTimeJob;

/**
 * source별 요청을 공통 형태로 해석한 결과.
 *  - businessSnapshot: 신고에 박제할 사업장 정보
 *  - partTimeJob:      REGISTERED 경로에서만 non-null
 */
public record ReportDraftSpec(
        BusinessSnapshot businessSnapshot,
        PartTimeJob partTimeJob
) {
    public static ReportDraftSpec of(BusinessSnapshot snapshot) {
        return new ReportDraftSpec(snapshot, null);
    }
}
