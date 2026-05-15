package com.albasave.albasave_server.report.service;

import com.albasave.albasave_server.report.domain.AnalysisLog;
import com.albasave.albasave_server.report.dto.*;
import com.albasave.albasave_server.report.repository.AnalysisLogRepository;
import com.albasave.albasave_server.workinglog.service.FcmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WageTheftReportService {

    private final AnalysisLogRepository analysisLogRepository;
    private final WageCalculationService wageCalculationService;
    private final ComplaintDraftService complaintDraftService;
    private final FcmService fcmService;

    /** 임금체불 신고 생성 */
    @Transactional
    public ReportResponse createReport(Long userId, CreateReportRequest req) {
        // 임금 계산
        WageCalculationService.WageCalculationResult wage = req.getPartTimeJobId() != null
                ? wageCalculationService.calculate(req.getPartTimeJobId(), req.getHourlyWage())
                : WageCalculationService.WageCalculationResult.empty(
                        req.getHourlyWage() > 0 ? req.getHourlyWage() : WageCalculationService.MINIMUM_WAGE_2026);

        long unpaidAmount = req.getActualReceivedAmount() != null
                ? wageCalculationService.calculateUnpaidAmount(req.getActualReceivedAmount(), wage)
                : (req.getManualUnpaidAmount() != null ? req.getManualUnpaidAmount() : 0L);

        AnalysisLog analysisLog = AnalysisLog.builder()
                .userId(userId)
                .partTimeJobId(req.getPartTimeJobId())
                .businessRegistrationNumber(req.getBusinessRegistrationNumber())
                .businessId(req.getBusinessId())
                .businessName(req.getBusinessName())
                .violationType(req.getViolationType())
                .unpaidAmount(unpaidAmount)
                .description(req.getDescription())
                .evidenceImageUrl(req.getEvidenceImageUrl())
                .status("DRAFT")
                .build();

        AnalysisLog saved = analysisLogRepository.save(analysisLog);

        // 공동 대응 가능 여부 확인 (사업자등록번호가 있을 때만)
        List<CollectiveActionInfo> collectiveActionCandidates = List.of();
        if (saved.getBusinessRegistrationNumber() != null) {
            collectiveActionCandidates = findOtherVictims(saved);
        }

        return ReportResponse.from(saved, wage, collectiveActionCandidates);
    }

    /** 진정서 초안 생성 */
    @Transactional
    public ComplaintDraftResponse generateComplaintDraft(Long userId, Long reportId) {
        AnalysisLog log = getReportByUser(userId, reportId);

        WageCalculationService.WageCalculationResult wage = log.getPartTimeJobId() != null
                ? wageCalculationService.calculate(log.getPartTimeJobId(), WageCalculationService.MINIMUM_WAGE_2026)
                : WageCalculationService.WageCalculationResult.empty(WageCalculationService.MINIMUM_WAGE_2026);

        String draft = complaintDraftService.generateComplaintDraft(log, wage);
        log.setComplaintDraft(draft);
        analysisLogRepository.save(log);

        return new ComplaintDraftResponse(reportId, draft,
                "https://minwon.moel.go.kr/minwon/main/mainView.do");
    }

    /** 내 신고 목록 조회 */
    @Transactional(readOnly = true)
    public List<ReportSummary> getMyReports(Long userId) {
        return analysisLogRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(ReportSummary::from)
                .toList();
    }

    /** 신고 상세 조회 */
    @Transactional(readOnly = true)
    public ReportResponse getReport(Long userId, Long reportId) {
        AnalysisLog log = getReportByUser(userId, reportId);
        WageCalculationService.WageCalculationResult wage = log.getPartTimeJobId() != null
                ? wageCalculationService.calculate(log.getPartTimeJobId(), WageCalculationService.MINIMUM_WAGE_2026)
                : WageCalculationService.WageCalculationResult.empty(WageCalculationService.MINIMUM_WAGE_2026);
        List<CollectiveActionInfo> victims = log.getBusinessRegistrationNumber() != null
                ? findOtherVictims(log)
                : List.of();
        return ReportResponse.from(log, wage, victims);
    }

    /** 공동 대응 가능 피해자 탐색 */
    private List<CollectiveActionInfo> findOtherVictims(AnalysisLog log) {
        LocalDateTime threeYearsAgo = LocalDateTime.now().minusYears(3);
        List<AnalysisLog> others = analysisLogRepository.findOtherVictimsAtSameBusiness(
                log.getBusinessRegistrationNumber(), log.getUserId(), threeYearsAgo);

        if (!others.isEmpty()) {
            log.setStatus("MATCHED");
        }

        return others.stream().map(CollectiveActionInfo::from).toList();
    }

    private AnalysisLog getReportByUser(Long userId, Long reportId) {
        AnalysisLog entity = analysisLogRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고 내역을 찾을 수 없습니다."));
        if (!entity.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 신고 내역만 조회할 수 있습니다.");
        }
        return entity;
    }
}
