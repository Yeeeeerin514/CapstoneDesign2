package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.business.domain.Business;
import com.albasave.albasave_server.business.repository.BusinessRepository;
import com.albasave.albasave_server.jobposting.dto.BusinessCandidate;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Component
public class DatabaseBusinessMatcher {
    private static final int MAX_CANDIDATES = 5;
    private static final int MIN_MATCH_SCORE = 35;

    private final BusinessRepository businessRepository;

    public DatabaseBusinessMatcher(BusinessRepository businessRepository) {
        this.businessRepository = businessRepository;
    }

    public List<BusinessCandidate> findCandidates(ExtractedJobPosting posting) {
        String name = firstNonBlank(posting.businessName(), posting.brandName());
        String address = posting.address();
        if (isBlank(name) && isBlank(address)) {
            return List.of();
        }

        List<Business> businesses = businessRepository.searchCandidates(blankToNull(name), blankToNull(address));
        return businesses.stream()
                .map(business -> toCandidate(business, posting))
                .filter(candidate -> candidate.matchScore() >= MIN_MATCH_SCORE)
                .sorted(Comparator.comparingInt(BusinessCandidate::matchScore).reversed())
                .limit(MAX_CANDIDATES)
                .toList();
    }

    private BusinessCandidate toCandidate(Business business, ExtractedJobPosting posting) {
        String queryName = normalize(firstNonBlank(posting.businessName(), posting.brandName()));
        String queryAddress = normalize(posting.address());
        String queryIndustry = normalize(posting.industryHint());
        String rowName = normalize(business.getName());
        String rowAddress = normalize(firstNonBlank(business.getRoadAddress(), business.getLocalAddress()));
        String rowIndustry = normalize(firstNonBlank(business.getIndustry(), business.getHygieneIndustry()));

        int score = score(queryName, queryAddress, queryIndustry, rowName, rowAddress, rowIndustry);

        return new BusinessCandidate(
                business.getName(),
                business.getLocalAddress(),
                business.getRoadAddress(),
                firstNonBlank(business.getIndustry(), business.getHygieneIndustry()),
                business.getBusinessStatus(),
                business.getDetailStatus(),
                business.getLicenseDate(),
                business.getClosureDate(),
                business.getPhone(),
                business.getSourceFile(),
                score
        );
    }

    private int score(
            String queryName,
            String queryAddress,
            String queryIndustry,
            String rowName,
            String rowAddress,
            String rowIndustry
    ) {
        int score = 0;

        if (!queryName.isBlank() && !rowName.isBlank()) {
            if (rowName.equals(queryName)) {
                score += 70;
            } else if (rowName.contains(queryName) || queryName.contains(rowName)) {
                score += 55;
            } else {
                score += sharedTokenScore(queryName, rowName, 35);
            }
        }

        if (!queryAddress.isBlank() && !rowAddress.isBlank()) {
            if (rowAddress.contains(queryAddress) || queryAddress.contains(rowAddress)) {
                score += 30;
            } else {
                score += sharedTokenScore(queryAddress, rowAddress, 25);
            }
        }

        if (!queryIndustry.isBlank() && !rowIndustry.isBlank()
                && (rowIndustry.contains(queryIndustry) || queryIndustry.contains(rowIndustry))) {
            score += 10;
        }

        return Math.min(score, 100);
    }

    private int sharedTokenScore(String left, String right, int maxScore) {
        String[] tokens = left.split("\\s+");
        int hits = 0;
        int considered = 0;
        for (String token : tokens) {
            if (token.length() < 2) {
                continue;
            }
            considered++;
            if (right.contains(token)) {
                hits++;
            }
        }
        if (considered == 0) {
            return 0;
        }
        return (int) Math.round(maxScore * (hits / (double) considered));
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^0-9a-z가-힣\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String blankToNull(String value) {
        return isBlank(value) ? null : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
