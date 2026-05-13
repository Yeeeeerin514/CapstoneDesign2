package com.albasave.albasave_server.business.service;

import com.albasave.albasave_server.business.domain.Business;
import com.albasave.albasave_server.business.dto.BusinessImportResponse;
import com.albasave.albasave_server.business.repository.BusinessRepository;
import com.albasave.albasave_server.jobposting.config.LocalDataProperties;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

@Service
public class LocalDataBusinessImportService {
    private final LocalDataProperties properties;
    private final BusinessRepository businessRepository;

    public LocalDataBusinessImportService(LocalDataProperties properties, BusinessRepository businessRepository) {
        this.properties = properties;
        this.businessRepository = businessRepository;
    }

    @Transactional
    public BusinessImportResponse importCsvFiles(Integer maxFiles) {
        Path directory = Path.of(properties.csvDirectory());
        if (!Files.isDirectory(directory)) {
            throw new IllegalStateException("CSV directory does not exist: " + directory);
        }

        AtomicInteger scannedFiles = new AtomicInteger();
        AtomicLong importedRows = new AtomicLong();
        AtomicLong skippedRows = new AtomicLong();

        try (Stream<Path> paths = Files.walk(directory, 1)) {
            List<Path> csvFiles = paths
                    .filter(path -> path.getFileName().toString().toLowerCase().endsWith(".csv"))
                    .sorted()
                    .limit(maxFiles == null || maxFiles <= 0 ? Long.MAX_VALUE : maxFiles)
                    .toList();

            for (Path csvFile : csvFiles) {
                scannedFiles.incrementAndGet();
                importOneFile(csvFile, importedRows, skippedRows);
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to import LocalData CSV files.", exception);
        }

        return new BusinessImportResponse(
                scannedFiles.get(),
                importedRows.get(),
                skippedRows.get(),
                businessRepository.count()
        );
    }

    private void importOneFile(Path csvFile, AtomicLong importedRows, AtomicLong skippedRows) {
        try (Reader reader = Files.newBufferedReader(csvFile, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            String sourceFile = csvFile.getFileName().toString();
            for (CSVRecord record : parser) {
                String name = get(record, "사업장명");
                String managementNumber = get(record, "관리번호");
                if (name.isBlank() || managementNumber.isBlank()) {
                    skippedRows.incrementAndGet();
                    continue;
                }
                if (businessRepository.findBySourceFileAndManagementNumber(sourceFile, managementNumber).isPresent()) {
                    skippedRows.incrementAndGet();
                    continue;
                }

                Business business = new Business(
                        name,
                        get(record, "소재지전체주소"),
                        get(record, "도로명전체주소"),
                        firstNonBlank(get(record, "업태구분명"), industryFromFileName(csvFile)),
                        get(record, "위생업태명"),
                        get(record, "영업상태명"),
                        get(record, "상세영업상태명"),
                        get(record, "인허가일자"),
                        get(record, "폐업일자"),
                        get(record, "소재지전화"),
                        get(record, "개방서비스명"),
                        get(record, "개방서비스아이디"),
                        managementNumber,
                        sourceFile
                );
                businessRepository.save(business);
                importedRows.incrementAndGet();
            }
        } catch (Exception exception) {
            skippedRows.incrementAndGet();
        }
    }

    private String get(CSVRecord record, String header) {
        return record.isMapped(header) ? record.get(header) : "";
    }

    private String firstNonBlank(String first, String second) {
        return first == null || first.isBlank() ? second : first;
    }

    private String industryFromFileName(Path path) {
        String fileName = path.getFileName().toString();
        int marker = fileName.lastIndexOf("_P_");
        if (marker < 0) {
            return fileName.replace(".csv", "");
        }
        return fileName.substring(marker + 3).replace(".csv", "");
    }
}
