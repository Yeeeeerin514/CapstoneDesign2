package com.albasave.albasave_server.report.controller;

import com.albasave.albasave_server.report.dto.*;
import com.albasave.albasave_server.report.service.WageCalculationService;
import com.albasave.albasave_server.report.service.WageTheftReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class WageTheftReportController {

    private final WageTheftReportService reportService;
    private final WageCalculationService wageCalculationService;

    /** 임금체불 신고 생성 */
    @PostMapping
    public ResponseEntity<ReportResponse> createReport(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CreateReportRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reportService.createReport(userId, req));
    }

    /** 내 신고 목록 */
    @GetMapping
    public ResponseEntity<List<ReportSummary>> getMyReports(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(reportService.getMyReports(userId));
    }

    /** 신고 상세 조회 */
    @GetMapping("/{reportId}")
    public ResponseEntity<ReportResponse> getReport(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long reportId) {
        return ResponseEntity.ok(reportService.getReport(userId, reportId));
    }

    /** 진정서 초안 생성 */
    @PostMapping("/{reportId}/complaint-draft")
    public ResponseEntity<ComplaintDraftResponse> generateComplaint(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long reportId) {
        return ResponseEntity.ok(reportService.generateComplaintDraft(userId, reportId));
    }

    /**
     * 알바 ID 기반 임금 계산 (신고 생성 전 확인용)
     * GET /api/reports/wage-calc?partTimeJobId=1&hourlyWage=10030
     */
    @GetMapping("/wage-calc")
    public ResponseEntity<WageBreakdown> calculateWage(
            @AuthenticationPrincipal Long userId,
            @RequestParam Long partTimeJobId,
            @RequestParam(defaultValue = "0") int hourlyWage) {
        WageCalculationService.WageCalculationResult result =
                wageCalculationService.calculate(partTimeJobId, hourlyWage);
        return ResponseEntity.ok(WageBreakdown.from(result));
    }
}
