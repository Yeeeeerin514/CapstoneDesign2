package com.albasave.albasave_server.report.controller;

import com.albasave.albasave_server.report.dto.AiDraftResponse;
import com.albasave.albasave_server.report.dto.CreateReportDraftRequest;
import com.albasave.albasave_server.report.dto.CreateReportDraftResponse;
import com.albasave.albasave_server.report.dto.GenerateComplaintDraftRequest;
import com.albasave.albasave_server.report.dto.PutEvidenceRequest;
import com.albasave.albasave_server.report.dto.ReportDetailResponse;
import com.albasave.albasave_server.report.dto.ReportSummaryResponse;
import com.albasave.albasave_server.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;

    /**
     * 신고 사건 draft 생성.
     * 요청 본문의 "source"에 따라 DTO가 다형적으로 역직렬화된다.
     * 사건 소유자는 인증 사용자로 고정된다.
     */
    @PostMapping("/draft")
    public ResponseEntity<CreateReportDraftResponse> createDraft(
            @AuthenticationPrincipal Long userId,
            @RequestBody CreateReportDraftRequest req) {
        return ResponseEntity.ok(reportService.createDraft(userId, req));
    }

    /**
     * 1단계 증거/진정 내용 저장 (부분 저장, 멱등).
     * 본인 소유 사건만 수정 가능.
     */
    @PutMapping("/{caseId}/evidence")
    public ResponseEntity<Void> putEvidence(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long caseId,
            @RequestBody PutEvidenceRequest req) {
        reportService.saveEvidence(userId, caseId, req);
        return ResponseEntity.ok().build();
    }

    /** 인증 사용자가 신고한 전체 사건 목록(최신순). */
    @GetMapping
    public ResponseEntity<List<ReportSummaryResponse>> getMyReports(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(reportService.getMyReports(userId));
    }

    /** 단건 상세 조회 — 본인 소유 사건만. */
    @GetMapping("/{caseId}")
    public ResponseEntity<ReportDetailResponse> getReport(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long caseId) {
        return ResponseEntity.ok(reportService.getReport(userId, caseId));
    }

    /**
     * AI 진정 내용 초안 생성 — 본인 소유 사건만. (프론트 generateReportDraft 계약)
     * 저장된 사건 정보(피해유형·자연어 서술·근무·체불)에 더해, 요청 본문의 협의 시도 선택값(선택)을
     * 함께 넘겨 Gemini가 진정 내용을 생성한다. 본문은 없을 수도 있다(협의 정황 미반영).
     */
    @PostMapping("/{caseId}/complaint-draft")
    public ResponseEntity<AiDraftResponse> generateComplaintDraft(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long caseId,
            @RequestBody(required = false) GenerateComplaintDraftRequest req) {
        return ResponseEntity.ok(reportService.generateComplaintDraft(userId, caseId, req));
    }
}
