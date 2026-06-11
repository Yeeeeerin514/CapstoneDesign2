package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.dto.BusinessCandidate;
import com.albasave.albasave_server.jobposting.dto.ConcernItem;
import com.albasave.albasave_server.jobposting.dto.ExternalRiskCheck;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import com.albasave.albasave_server.jobposting.dto.LlmConcern;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
public class JobPostingRiskAnalyzer {
    // 단일 출처: WageCalculationService 상수 — 연도 갱신 시 한 곳만 수정.
    private static final int MINIMUM_WAGE_2026 =
            com.albasave.albasave_server.report.service.WageCalculationService.MINIMUM_WAGE_2026;

    public List<ConcernItem> analyze(
            ExtractedJobPosting posting,
            List<BusinessCandidate> candidates,
            List<ExternalRiskCheck> externalChecks
    ) {
        List<ConcernItem> concerns = new ArrayList<>();
        addLlmConcerns(posting, concerns);
        addPostingConcerns(posting, concerns);
        addBusinessConcerns(candidates, concerns);
        addExternalConcerns(externalChecks, concerns);

        // 소스(LLM·룰베이스)가 달라도 제목이 같으면 1장으로 병합 — 화면 중복 카드 제거.
        concerns = mergeDuplicates(concerns);

        if (concerns.isEmpty()) {
            concerns.add(new ConcernItem(
                    "SUMMARY",
                    "LOW",
                    "즉시 확인되는 고위험 문구는 적습니다",
                    "공고 이미지와 매칭된 공공데이터만으로는 명확한 법 위반을 단정하기 어렵습니다. 실제 지원 전 근로계약서, 휴게시간, 주휴수당, 4대보험 적용 여부를 다시 확인하는 것이 좋습니다.",
                    "공고 이미지 및 공공데이터 분석"
            ));
        }

        return concerns;
    }

    public String buildUserReport(
            ExtractedJobPosting posting,
            List<BusinessCandidate> candidates,
            List<ExternalRiskCheck> externalChecks,
            List<ConcernItem> concerns
    ) {
        StringBuilder report = new StringBuilder();
        report.append("공고문 분석 결과입니다. 이 결과는 법적 판단이 아니라 지원 전 위험 신호를 정리한 참고 리포트입니다.\n\n");

        report.append("1. 추출된 핵심 정보\n");
        appendLine(report, "업장명", posting.businessName());
        appendLine(report, "브랜드", posting.brandName());
        appendLine(report, "사업자등록번호", posting.businessRegistrationNumber());
        appendLine(report, "전화번호", posting.phone());
        appendLine(report, "주소", posting.address());
        appendLine(report, "직무", posting.jobTitle());
        appendLine(report, "급여", posting.hourlyWageText());
        appendLine(report, "근무시간", posting.workTimeText());
        appendLine(report, "근무요일", posting.workScheduleText());

        report.append("\n2. 업장 DB 매칭 후보\n");
        if (candidates.isEmpty()) {
            report.append("- 현재 DB에서 충분히 확실한 업장 후보를 찾지 못했습니다. 상호명, 주소, 전화번호를 사용자가 확인하도록 해야 합니다.\n");
        } else {
            for (BusinessCandidate candidate : candidates) {
                report.append("- ")
                        .append(candidate.businessName())
                        .append(" / ")
                        .append(nonBlank(candidate.roadAddress(), candidate.address()))
                        .append(" / 상태: ")
                        .append(nonBlank(candidate.businessStatus(), "미확인"))
                        .append(" / 매칭 ")
                        .append(candidate.matchScore())
                        .append("점\n");
            }
        }

        report.append("\n3. 외부 공공 API 확인\n");
        for (ExternalRiskCheck check : externalChecks) {
            report.append("- [")
                    .append(check.status())
                    .append("] ")
                    .append(check.title())
                    .append(": ")
                    .append(check.description())
                    .append("\n");
        }

        report.append("\n4. 우려 사항\n");
        for (ConcernItem concern : concerns) {
            report.append("- [")
                    .append(concern.severity())
                    .append("] ")
                    .append(concern.title())
                    .append(": ")
                    .append(concern.description())
                    .append("\n");
        }

        return report.toString();
    }

    private void addLlmConcerns(ExtractedJobPosting posting, List<ConcernItem> concerns) {
        for (LlmConcern c : safeList(posting.llmConcerns())) {
            if (c == null || c.title() == null || c.description() == null) continue;
            String type = "LLM_" + (c.category() == null ? "OTHER" : c.category());
            String severity = c.severity() == null ? "MEDIUM" : c.severity();
            concerns.add(new ConcernItem(
                    type,
                    severity,
                    c.title(),
                    c.description(),
                    c.evidence()
            ));
        }
    }

    private void addPostingConcerns(ExtractedJobPosting posting, List<ConcernItem> concerns) {
        if (posting.hourlyWage() != null && posting.hourlyWage() < MINIMUM_WAGE_2026) {
            concerns.add(new ConcernItem(
                    "WAGE",
                    "HIGH",
                    "최저임금 미달 가능성",
                    String.format(
                            "추출된 시급이 2026년 적용 최저임금 %,d원보다 낮습니다. 수습기간, 포괄임금, 주휴수당 포함 여부와 무관하게 실제 지급 조건을 반드시 확인해야 합니다.",
                            MINIMUM_WAGE_2026),
                    posting.hourlyWageText()
            ));
        }

        // 같은 유형의 의심 문구는 모아서 카드 1장으로 — 문구마다 1장씩 만들면
        // "근로조건 불명확"이 근거만 다른 채 반복 표시된다.
        List<String> allowancePhrases = new ArrayList<>();
        List<String> conditionPhrases = new ArrayList<>();
        List<String> penaltyPhrases = new ArrayList<>();
        List<String> urgencyPhrases = new ArrayList<>();
        for (String phrase : safeList(posting.suspiciousPhrases())) {
            String normalized = phrase.toLowerCase(Locale.ROOT);
            if (containsAny(normalized, "주휴수당 포함", "주휴 포함")) {
                allowancePhrases.add(phrase);
            } else if (containsAny(normalized, "협의", "추후협의", "면접")) {
                conditionPhrases.add(phrase);
            } else if (containsAny(normalized, "벌금", "손해배상", "위약금")) {
                penaltyPhrases.add(phrase);
            } else if (containsAny(normalized, "당일지급", "급구", "바로근무")) {
                urgencyPhrases.add(phrase);
            }
        }
        if (!allowancePhrases.isEmpty()) {
            concerns.add(new ConcernItem(
                    "ALLOWANCE",
                    "MEDIUM",
                    "주휴수당 포함 표기 확인 필요",
                    "공고에 주휴수당 포함 취지의 표현이 보입니다. 실제 기본시급과 주휴수당이 구분되어 지급되는지 확인해야 합니다.",
                    String.join(" · ", allowancePhrases)
            ));
        }
        if (!conditionPhrases.isEmpty()) {
            concerns.add(new ConcernItem(
                    "CONDITION",
                    "MEDIUM",
                    "근로조건 불명확",
                    "급여나 근무조건이 협의로만 제시되면 지원자가 실제 조건을 사전에 파악하기 어렵습니다. 계약서 작성 전 구체적인 시급, 시간, 휴게시간을 확인해야 합니다.",
                    String.join(" · ", conditionPhrases)
            ));
        }
        if (!penaltyPhrases.isEmpty()) {
            concerns.add(new ConcernItem(
                    "PENALTY",
                    "HIGH",
                    "위약금 또는 벌금 약정 가능성",
                    "근로자에게 벌금, 위약금, 손해배상을 예정하는 표현은 근로기준법상 문제가 될 수 있습니다. 계약서에 같은 조항이 있으면 특히 주의해야 합니다.",
                    String.join(" · ", penaltyPhrases)
            ));
        }
        if (!urgencyPhrases.isEmpty()) {
            concerns.add(new ConcernItem(
                    "POSTING_PATTERN",
                    "LOW",
                    "급구/즉시근무 문구",
                    "급구 표현 자체가 위법은 아니지만, 근로계약서 작성 없이 바로 근무를 요구하는지 확인할 필요가 있습니다.",
                    String.join(" · ", urgencyPhrases)
            ));
        }

        // 누락 정보는 1장으로 합산. 이미 같은 주제의 우려가 있으면(예: judge의 "휴게시간 미언급"
        // 제목에 항목명이 포함) 중복이므로 그 항목은 제외한다.
        List<String> missingItems = new ArrayList<>();
        for (String missing : safeList(posting.missingInformation())) {
            if (missing == null || missing.isBlank()) continue;
            String item = missing.trim();
            boolean coveredElsewhere = concerns.stream()
                    .anyMatch(c -> c.title() != null && c.title().contains(item));
            if (!coveredElsewhere && !missingItems.contains(item)) {
                missingItems.add(item);
            }
        }
        if (!missingItems.isEmpty()) {
            String joined = String.join(", ", missingItems);
            concerns.add(new ConcernItem(
                    "MISSING_INFO",
                    "LOW",
                    "공고 내 중요 정보 미확인",
                    joined + " 항목이 이미지에서 명확히 확인되지 않았습니다.",
                    joined
            ));
        }
    }

    /** 제목이 같은 우려를 1장으로 병합 — 근거는 ' · '로 잇고, 심각도는 더 높은 쪽을 유지. */
    private List<ConcernItem> mergeDuplicates(List<ConcernItem> concerns) {
        java.util.LinkedHashMap<String, ConcernItem> byTitle = new java.util.LinkedHashMap<>();
        for (ConcernItem c : concerns) {
            String key = c.title() == null
                    ? "_anon_" + System.identityHashCode(c)
                    : c.title().trim();
            ConcernItem prev = byTitle.get(key);
            if (prev == null) {
                byTitle.put(key, c);
                continue;
            }
            ConcernItem keep = severityRank(c.severity()) > severityRank(prev.severity()) ? c : prev;
            byTitle.put(key, new ConcernItem(
                    keep.type(),
                    keep.severity(),
                    keep.title(),
                    keep.description(),
                    joinEvidence(prev.evidence(), c.evidence())
            ));
        }
        return new ArrayList<>(byTitle.values());
    }

    private String joinEvidence(String a, String b) {
        if (a == null || a.isBlank()) return b;
        if (b == null || b.isBlank()) return a;
        if (a.contains(b)) return a;
        return a + " · " + b;
    }

    private int severityRank(String severity) {
        if ("HIGH".equalsIgnoreCase(severity)) return 3;
        if ("MEDIUM".equalsIgnoreCase(severity)) return 2;
        return 1;
    }

    private void addBusinessConcerns(List<BusinessCandidate> candidates, List<ConcernItem> concerns) {
        if (candidates.isEmpty()) {
            concerns.add(new ConcernItem(
                    "MATCHING",
                    "MEDIUM",
                    "업장 식별 불확실",
                    "공고에서 추출한 정보만으로 인허가/영업상태 DB의 사업장을 확정하지 못했습니다. 사용자에게 상호명과 주소 확인 단계를 제공해야 합니다.",
                    "DB 매칭 후보 없음"
            ));
            return;
        }

        BusinessCandidate best = candidates.get(0);
        if (best.matchScore() < 60) {
            concerns.add(new ConcernItem(
                    "MATCHING",
                    "MEDIUM",
                    "업장 매칭 신뢰도 낮음",
                    "가장 유사한 후보의 매칭 점수가 낮습니다. 같은 상호 또는 유사 주소의 다른 업장일 수 있으므로 사용자 확인이 필요합니다.",
                    best.businessName() + " / " + best.matchScore()
            ));
        }

        if (containsAny(nonBlank(best.businessStatus(), ""), "폐업", "휴업", "말소", "취소", "중지")) {
            concerns.add(new ConcernItem(
                    "PUBLIC_DATA",
                    "HIGH",
                    "공공데이터상 영업 상태 확인 필요",
                    "가장 유사한 업장 후보가 공공데이터상 정상 영업 상태가 아닐 수 있습니다. 실제 동일 업장인지 확인한 뒤 지원 여부를 판단해야 합니다.",
                    best.businessStatus() + " " + nonBlank(best.closureDate(), "")
            ));
        }

        if (best.licenseDate() != null && best.licenseDate().length() >= 4) {
            try {
                int year = Integer.parseInt(best.licenseDate().substring(0, 4));
                if (year >= LocalDate.now().getYear() - 1) {
                    concerns.add(new ConcernItem(
                            "PUBLIC_DATA",
                            "LOW",
                            "최근 인허가 업장",
                            "최근 1년 내 인허가된 업장 후보입니다. 신규 업장 자체가 위험하다는 뜻은 아니지만 초기 근로계약 조건은 꼼꼼히 확인하는 편이 좋습니다.",
                            best.licenseDate()
                    ));
                }
            } catch (NumberFormatException ignored) {
                // Ignore malformed public-data dates.
            }
        }
    }

    private void addExternalConcerns(List<ExternalRiskCheck> externalChecks, List<ConcernItem> concerns) {
        for (ExternalRiskCheck check : externalChecks) {
            if ("RISK".equalsIgnoreCase(check.status()) || "FOUND".equalsIgnoreCase(check.status())) {
                concerns.add(new ConcernItem(
                        "EXTERNAL_API",
                        "HIGH",
                        check.title(),
                        check.description(),
                        check.evidence()
                ));
            }
        }
    }

    private void appendLine(StringBuilder builder, String label, String value) {
        builder.append("- ")
                .append(label)
                .append(": ")
                .append(nonBlank(value, "미확인"))
                .append("\n");
    }

    private boolean containsAny(String source, String... needles) {
        if (source == null) {
            return false;
        }
        for (String needle : needles) {
            if (source.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private <T> List<T> safeList(List<T> values) {
        return values == null ? List.of() : values;
    }

    private String nonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
