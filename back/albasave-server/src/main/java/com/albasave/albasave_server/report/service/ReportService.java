package com.albasave.albasave_server.report.service;

import com.albasave.albasave_server.report.domain.BusinessSnapshot;
import com.albasave.albasave_server.report.domain.ComplaintFacts;
import com.albasave.albasave_server.report.domain.Report;
import com.albasave.albasave_server.report.domain.RespondentInfo;
import com.albasave.albasave_server.report.domain.damageTypeCode;
import com.albasave.albasave_server.report.dto.AiDraftContext;
import com.albasave.albasave_server.report.dto.AiDraftResponse;
import com.albasave.albasave_server.report.dto.CreateReportDraftRequest;
import com.albasave.albasave_server.report.dto.CreateReportDraftResponse;
import com.albasave.albasave_server.report.dto.GenerateComplaintDraftRequest;
import com.albasave.albasave_server.report.dto.PutEvidenceRequest;
import com.albasave.albasave_server.report.dto.ReportDetailResponse;
import com.albasave.albasave_server.report.dto.ReportDraftSpec;
import com.albasave.albasave_server.report.dto.ReportSummaryResponse;
import com.albasave.albasave_server.report.exception.ReportAccessDeniedException;
import com.albasave.albasave_server.report.repository.ReportRepository;
import com.albasave.albasave_server.userinfo.domain.User;
import com.albasave.albasave_server.userinfo.repository.UserRepository;
import com.albasave.albasave_server.workinglog.repository.PartTimeJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public AiDraftResponse generateComplaintDraft(Long userId, Long caseId,
                                                  GenerateComplaintDraftRequest req) {
        Report report = reportRepository.findById(caseId)
                .orElseThrow(() -> new IllegalArgumentException("신고 사건을 찾을 수 없습니다: " + caseId));

        if (!report.isOwnedBy(userId)) {
            throw new ReportAccessDeniedException("본인 소유의 신고만 사용할 수 있습니다.");
        }

        String negotiationFact = resolveNegotiationFact(req == null ? null : req.negotiationStatus());
        AiDraftContext ctx = buildAiDraftContext(report, negotiationFact);
        String content = geminiAiService.generatePetitionContent(ctx);
        return new AiDraftResponse(content);
    }

    /**
     * 프론트의 협의 시도 선택 키를 '사실 서술'로 변환한다.
     * 프론트의 안내/초안 문구와 다른 표현을 의도적으로 쓴다 — 이 값은 AI가 격식체로 다시 풀어 쓸
     * '재료'일 뿐, 그대로 진정서에 박히지 않도록 GeminiAiService 프롬프트가 재서술을 지시한다.
     * 알 수 없는 값/누락이면 null(→ 협의 정황 미반영).
     */
    private String resolveNegotiationFact(String status) {
        if (status == null) {
            return null;
        }
        return switch (status) {
            case "refused" -> "진정인이 사업주에게 임금 지급을 요청하였으나 사업주가 지급을 거부함";
            case "not-tried" -> "진정인이 아직 사업주에게 임금 지급을 직접 요청하지는 않음";
            case "no-response" -> "진정인이 사업주에게 연락을 시도하였으나 사업주로부터 응답을 받지 못함";
            default -> null;
        };
    }

    /**
     * Report에 저장된 사실로 AI 프롬프트 컨텍스트를 구성.
     * 진정 내용 작성에 필요한 5가지(피해유형·자연어서술·사업장명·입사일·체불총액)만 담는다.
     * 없는 값은 null(→ 프롬프트에서 "(미입력)").
     */
    private AiDraftContext buildAiDraftContext(Report report, String negotiationFact) {
        List<String> typeLabels = report.getDamageTypes().stream()
                .map(damageTypeCode::getDescription)
                .toList();

        BusinessSnapshot biz = report.getBusiness();
        ComplaintFacts facts = report.getFacts();

        return AiDraftContext.builder()
                .damageTypeLabels(typeLabels)
                .freeFormDescription(report.getFreeFormDescription())
                .businessName(biz != null ? biz.getName() : null)
                .employmentStartDate(facts != null ? facts.getEmploymentStartDate() : null)
                .totalUnpaidWage(facts != null ? facts.getTotalUnpaidWage() : null)
                .negotiationFact(negotiationFact)
                .build();
    }
}
