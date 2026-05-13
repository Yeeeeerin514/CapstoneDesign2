package com.albasave.albasave_server.jobposting.service;

import com.albasave.albasave_server.jobposting.config.LocalDataProperties;
import com.albasave.albasave_server.jobposting.dto.BusinessCandidate;
import com.albasave.albasave_server.jobposting.dto.ExtractedJobPosting;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.PriorityQueue;
import java.util.stream.Stream;

@Component
public class LocalBusinessMatcher {
    private static final int MAX_CANDIDATES = 5;
    private static final int MIN_MATCH_SCORE = 35;

    private final LocalDataProperties properties;

    public LocalBusinessMatcher(LocalDataProperties properties) {
        this.properties = properties;
    }

    public List<BusinessCandidate> findCandidates(ExtractedJobPosting posting) {
        String businessName = normalize(firstNonBlank(posting.businessName(), posting.brandName()));
        String address = normalize(posting.address());
        String industryHint = normalize(posting.industryHint());

        if (businessName.isBlank() && address.isBlank()) {
            return List.of();
        }

        Path directory = Path.of(properties.csvDirectory());
        if (!Files.isDirectory(directory)) {
            return List.of();
        }

        PriorityQueue<BusinessCandidate> topCandidates = new PriorityQueue<>(Comparator.comparingInt(BusinessCandidate::matchScore));

        try (Stream<Path> paths = Files.walk(directory, 1)) {
            paths.filter(path -> path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".csv"))
                    .forEach(path -> scanCsv(path, businessName, address, industryHint, topCandidates));
        } catch (IOException ignored) {
            return List.of();
        }

        List<BusinessCandidate> result = new ArrayList<>(topCandidates);
        result.sort(Comparator.comparingInt(BusinessCandidate::matchScore).reversed());
        return result;
    }

    private void scanCsv(
            Path path,
            String businessName,
            String address,
            String industryHint,
            PriorityQueue<BusinessCandidate> topCandidates
    ) {
        try (Reader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            String fileIndustry = industryFromFileName(path);
            for (CSVRecord record : parser) {
                String rowName = get(record, "사업장명");
                String rowAddress = firstNonBlank(get(record, "도로명전체주소"), get(record, "소재지전체주소"));
                int score = score(
                        businessName,
                        address,
                        industryHint,
                        normalize(rowName),
                        normalize(rowAddress),
                        normalize(fileIndustry)
                );

                if (score < MIN_MATCH_SCORE) {
                    continue;
                }

                BusinessCandidate candidate = new BusinessCandidate(
                        rowName,
                        get(record, "소재지전체주소"),
                        get(record, "도로명전체주소"),
                        firstNonBlank(get(record, "업태구분명"), get(record, "위생업태명"), fileIndustry),
                        get(record, "영업상태명"),
                        get(record, "상세영업상태명"),
                        get(record, "인허가일자"),
                        get(record, "폐업일자"),
                        get(record, "소재지전화"),
                        path.getFileName().toString(),
                        score
                );
                addCandidate(topCandidates, candidate);
            }
        } catch (Exception ignored) {
            // LocalData CSV schemas are not fully uniform. Unreadable files are skipped for MVP matching.
        }
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

    private void addCandidate(PriorityQueue<BusinessCandidate> topCandidates, BusinessCandidate candidate) {
        topCandidates.add(candidate);
        if (topCandidates.size() > MAX_CANDIDATES) {
            topCandidates.poll();
        }
    }

    private String get(CSVRecord record, String header) {
        return record.isMapped(header) ? record.get(header) : "";
    }

    private String industryFromFileName(Path path) {
        String fileName = path.getFileName().toString();
        int marker = fileName.lastIndexOf("_P_");
        if (marker < 0) {
            return fileName.replace(".csv", "");
        }
        return fileName.substring(marker + 3).replace(".csv", "");
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
}
