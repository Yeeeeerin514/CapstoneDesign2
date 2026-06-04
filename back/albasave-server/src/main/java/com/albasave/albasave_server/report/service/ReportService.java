package com.albasave.albasave_server.report.service;

import com.albasave.albasave_server.report.domain.BusinessSnapshot;
import com.albasave.albasave_server.report.domain.ComplaintFacts;
import com.albasave.albasave_server.report.domain.ContractMethod;
import com.albasave.albasave_server.report.domain.EmploymentStatus;
import com.albasave.albasave_server.report.domain.Report;
import com.albasave.albasave_server.report.domain.RespondentInfo;
import com.albasave.albasave_server.report.domain.damageTypeCode;
import com.albasave.albasave_server.report.dto.AiDraftContext;
import com.albasave.albasave_server.report.dto.AiDraftResponse;
import com.albasave.albasave_server.report.dto.CreateReportDraftRequest;
import com.albasave.albasave_server.report.dto.CreateReportDraftResponse;
import com.albasave.albasave_server.report.dto.PutEvidenceRequest;
import com.albasave.albasave_server.report.dto.ReportDetailResponse;
import com.albasave.albasave_server.report.dto.ReportDraftSpec;
import com.albasave.albasave_server.report.dto.ReportSummaryResponse;
import com.albasave.albasave_server.report.exception.ReportAccessDeniedException;
import com.albasave.albasave_server.report.repository.ReportRepository;
import com.albasave.albasave_server.userinfo.domain.User;
import com.albasave.albasave_server.userinfo.repository.UserRepository;
import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import com.albasave.albasave_server.workinglog.repository.PartTimeJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ReportService {
    private final ReportRepository reportRepository;
    private final PartTimeJobRepository partTimeJobRepository;
    private final UserRepository userRepository;
    private final GeminiAiService geminiAiService;

    /**
     * 신고 draft 생성 — 단계 진행 없이 "그릇"만 만든다.
     * source별 분기는 요청 DTO의 다형성(resolve)에 위임하므로 여기엔 if/switch가 없다.
     */
    public CreateReportDraftResponse createDraft(Long userId, CreateReportDraftRequest req) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        ReportDraftSpec spec = req.resolve(id ->
                partTimeJobRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException("등록된 알바 정보를 찾을 수 없습니다: " + id)));

        Report report = Report.createDraft(
                owner,
                req.getSource(),
                spec.businessSnapshot(),
                spec.partTimeJob());

        reportRepository.save(report);
        return CreateReportDraftResponse.from(report);
    }

    /**
     * evidence 저장(부분 업데이트, 멱등).
     * 본인 소유 사건만 수정 가능.
     */
    public void saveEvidence(Long userId, Long caseId, PutEvidenceRequest req) {
        Report report = reportRepository.findById(caseId)
                .orElseThrow(() -> new IllegalArgumentException("신고 사건을 찾을 수 없습니다: " + caseId));

        if (!report.isOwnedBy(userId)) {
            throw new ReportAccessDeniedException("본인 소유의 신고만 수정할 수 있습니다.");
        }

        Set<damageTypeCode> codes = (req.damageTypes() == null) ? null
                : req.damageTypes().stream()
                        .map(damageTypeCode::fromFrontendKey)
                        .collect(Collectors.toCollection(LinkedHashSet::new));

        RespondentInfo respondent = (req.respondent() == null) ? null : req.respondent().toEntity();
        ComplaintFacts facts = (req.facts() == null) ? null : req.facts().toEntity();

        report.applyEvidence(codes, req.freeFormDescription(), respondent, facts);
        // @Transactional 영속성 컨텍스트 dirty checking으로 저장됨.
    }

    /** 인증 사용자가 신고한 전체 사건 목록(최신순). */
    @Transactional(readOnly = true)
    public List<ReportSummaryResponse> getMyReports(Long userId) {
        return reportRepository.findAllByOwnerIdOrderByCreatedAtDesc(userId).stream()
                .map(ReportSummaryResponse::from)
                .toList();
    }

    /** 단건 상세 조회 — 본인 소유 사건만. */
    @Transactional(readOnly = true)
    public ReportDetailResponse getReport(Long userId, Long caseId) {
        Report report = reportRepository.findById(caseId)
                .orElseThrow(() -> new IllegalArgumentException("신고 사건을 찾을 수 없습니다: " + caseId));

        if (!report.isOwnedBy(userId)) {
            throw new ReportAccessDeniedException("본인 소유의 신고만 조회할 수 있습니다.");
        }
        return ReportDetailResponse.from(report);
    }

    /**
     * AI 진정 내용 생성 — 본인 소유 사건만.
     * 요청 본문 없이 caseId만 받는다(프론트 계약). 피해 유형·자연어 서술을 포함한 모든 입력은
     * evidence 단계에서 저장된 사건 정보에서 읽어 Gemini에 전달한다.
     */
    @Transactional(readOnly = true)
    public AiDraftResponse generateComplaintDraft(Long userId, Long caseId) {
        Report report = reportRepository.findById(caseId)
                .orElseThrow(() -> new IllegalArgumentException("신고 사건을 찾을 수 없습니다: " + caseId));

        if (!report.isOwnedBy(userId)) {
            throw new ReportAccessDeniedException("본인 소유의 신고만 사용할 수 있습니다.");
        }

        AiDraftContext ctx = buildAiDraftContext(report);
        String content = geminiAiService.generatePetitionContent(ctx);
        return new AiDraftResponse(content);
    }

    /** Report에 저장된 사실로 AI 프롬프트 컨텍스트를 구성. 없는 값은 null(→ 프롬프트에서 "(미입력)"). */
    private AiDraftContext buildAiDraftContext(Report report) {
        List<String> typeLabels = report.getDamageTypes().stream()
                .map(damageTypeCode::getDescription)
                .toList();

        String freeForm = report.getFreeFormDescription();

        BusinessSnapshot biz = report.getBusiness();
        ComplaintFacts facts = report.getFacts();
        PartTimeJob job = report.getPartTimeJob();

        return AiDraftContext.builder()
                .damageTypeLabels(typeLabels)
                .freeFormDescription(freeForm)
                .businessName(biz != null ? biz.getName() : null)
                .businessAddress(biz != null ? biz.getAddress() : null)
                .employmentStartDate(firstNonBlank(
                        facts != null ? facts.getEmploymentStartDate() : null,
                        (job != null && job.getStartDay() != null) ? job.getStartDay().toString() : null))
                .employmentEndDate(firstNonBlank(
                        facts != null ? facts.getEmploymentEndDate() : null,
                        (job != null && job.getEndDay() != null) ? job.getEndDay().toString() : null))
                .employmentStatusLabel(facts != null ? statusLabel(facts.getEmploymentStatus()) : null)
                .workSchedule(job != null ? formatSchedule(job) : null)
                .jobDescription(facts != null ? facts.getJobDescription() : null)
                .hourlyWage(job != null ? job.getHourlyWage() : null)
                .contractMethodLabel(facts != null ? contractLabel(facts.getContractMethod()) : null)
                .totalUnpaidWage(facts != null ? facts.getTotalUnpaidWage() : null)
                .unpaidSeverance(facts != null ? facts.getUnpaidSeverance() : null)
                .otherUnpaid(facts != null ? facts.getOtherUnpaid() : null)
                .wagePaymentDate(facts != null ? facts.getWagePaymentDate() : null)
                .build();
    }

    private String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        if (b != null && !b.isBlank()) return b;
        return null;
    }

    private String statusLabel(EmploymentStatus status) {
        if (status == null) return null;
        return status == EmploymentStatus.FORMER ? "퇴직" : "재직 중";
    }

    private String contractLabel(ContractMethod method) {
        if (method == null) return null;
        return method == ContractMethod.WRITTEN ? "서면" : "구두";
    }

    /** PartTimeJob의 요일 비트마스크 + 근무 시각 → "월,수,금 09:00~18:00" 형태. */
    private String formatSchedule(PartTimeJob job) {
        String days = formatDays(job.getDays());
        String time = (job.getStartTime() != null && job.getEndTime() != null)
                ? job.getStartTime() + "~" + job.getEndTime()
                : null;
        if (days == null && time == null) return null;
        if (days == null) return time;
        if (time == null) return days;
        return days + " " + time;
    }

    private String formatDays(Integer mask) {
        if (mask == null || mask == 0) return null;
        String[] names = {"월", "화", "수", "목", "금", "토", "일"};
        List<String> out = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            if ((mask & (1 << i)) != 0) out.add(names[i]);
        }
        return out.isEmpty() ? null : String.join(",", out);
    }
}
