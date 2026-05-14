package com.albasave.albasave_server.business.service;

import com.albasave.albasave_server.business.domain.Business;
import com.albasave.albasave_server.business.dto.BusinessImportResponse;
import com.albasave.albasave_server.business.repository.BusinessRepository;
import com.albasave.albasave_server.jobposting.config.LocalDataProperties;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Reader;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

@Service
public class LocalDataBusinessImportService {
    private static final Logger log = LoggerFactory.getLogger(LocalDataBusinessImportService.class);

    private static final Charset LOCALDATA_CHARSET = Charset.forName("MS949");
    private static final int BATCH_SIZE = 1000;

    private static final String H_BUSINESS_NAME = "\uC0AC\uC5C5\uC7A5\uBA85";
    private static final String H_MANAGEMENT_NUMBER = "\uAD00\uB9AC\uBC88\uD638";
    private static final String H_LOCAL_ADDRESS = "\uC18C\uC7AC\uC9C0\uC804\uCCB4\uC8FC\uC18C";
    private static final String H_ROAD_ADDRESS = "\uB3C4\uB85C\uBA85\uC804\uCCB4\uC8FC\uC18C";
    private static final String H_INDUSTRY = "\uC5C5\uD0DC\uAD6C\uBD84\uBA85";
    private static final String H_HYGIENE_INDUSTRY = "\uC704\uC0DD\uC5C5\uD0DC\uBA85";
    private static final String H_BUSINESS_STATUS = "\uC601\uC5C5\uC0C1\uD0DC\uBA85";
    private static final String H_DETAIL_STATUS = "\uC0C1\uC138\uC601\uC5C5\uC0C1\uD0DC\uBA85";
    private static final String H_LICENSE_DATE = "\uC778\uD5C8\uAC00\uC77C\uC790";
    private static final String H_CLOSURE_DATE = "\uD3D0\uC5C5\uC77C\uC790";
    private static final String H_PHONE = "\uC18C\uC7AC\uC9C0\uC804\uD654";
    private static final String H_SERVICE_NAME = "\uAC1C\uBC29\uC11C\uBE44\uC2A4\uBA85";
    private static final String H_SERVICE_ID = "\uAC1C\uBC29\uC11C\uBE44\uC2A4\uC544\uC774\uB514";

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
        try (Reader reader = Files.newBufferedReader(csvFile, LOCALDATA_CHARSET);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setAllowMissingColumnNames(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            String sourceFile = csvFile.getFileName().toString();
            List<Business> batch = new ArrayList<>(BATCH_SIZE);
            for (CSVRecord record : parser) {
                String name = get(record, H_BUSINESS_NAME);
                String managementNumber = get(record, H_MANAGEMENT_NUMBER);
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
                        get(record, H_LOCAL_ADDRESS),
                        get(record, H_ROAD_ADDRESS),
                        firstNonBlank(get(record, H_INDUSTRY), industryFromFileName(csvFile)),
                        get(record, H_HYGIENE_INDUSTRY),
                        get(record, H_BUSINESS_STATUS),
                        get(record, H_DETAIL_STATUS),
                        get(record, H_LICENSE_DATE),
                        get(record, H_CLOSURE_DATE),
                        get(record, H_PHONE),
                        get(record, H_SERVICE_NAME),
                        get(record, H_SERVICE_ID),
                        managementNumber,
                        sourceFile
                );
                batch.add(business);
                importedRows.incrementAndGet();
                if (batch.size() >= BATCH_SIZE) {
                    businessRepository.saveAll(batch);
                    batch.clear();
                }
            }
            if (!batch.isEmpty()) {
                businessRepository.saveAll(batch);
            }
        } catch (Exception exception) {
            log.warn("Failed to import LocalData CSV file: {}", csvFile, exception);
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
