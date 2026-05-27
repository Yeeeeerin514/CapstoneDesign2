package com.albasave.albasave_server.wagearrears.service;

import com.albasave.albasave_server.wagearrears.domain.WageArrearsEmployer;
import com.albasave.albasave_server.wagearrears.repository.WageArrearsEmployerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * 고용노동부 체불사업주 CSV → DB 임포트.
 *
 * - 앱 시작 시 1회 실행
 * - WAGE_ARREARS_CSV_PATH 환경변수가 가리키는 파일 사용
 * - 이미 임포트된 행은 (normalized_name, representative_name) 키로 중복 회피
 *
 * CSV 포맷: 대표자명,상호명,제외일자  (헤더 1줄, UTF-8 BOM 가능)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WageArrearsCsvImporter {

    private final WageArrearsEmployerRepository repository;

    @Value("${albasave.wage-arrears.csv-path:}")
    private String csvPath;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void importOnStartup() {
        if (csvPath == null || csvPath.isBlank()) {
            log.info("[WageArrears] CSV 경로 미지정 — 임포트 건너뜀");
            return;
        }
        Path path = Path.of(csvPath);
        if (!Files.exists(path)) {
            log.warn("[WageArrears] CSV 파일을 찾을 수 없음: {}", csvPath);
            return;
        }
        try {
            int imported = importFromFile(path);
            log.info("[WageArrears] CSV 임포트 완료: 신규 {} 건", imported);
        } catch (IOException e) {
            log.error("[WageArrears] CSV 임포트 실패: {}", e.getMessage());
        }
    }

    public int importFromFile(Path path) throws IOException {
        List<WageArrearsEmployer> toSave = new ArrayList<>();
        try (BufferedReader br = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String line;
            boolean first = true;
            while ((line = br.readLine()) != null) {
                if (first) {
                    first = false;
                    continue;
                }
                if (line.isBlank()) continue;
                String[] cols = parseCsvLine(line);
                if (cols.length < 2) continue;

                String rep = stripBom(cols[0]).trim();
                String name = stripBom(cols.length > 1 ? cols[1] : "").trim();
                String dateStr = cols.length > 2 ? cols[2].trim() : "";
                if (name.isBlank()) continue;

                String normalized = WageArrearsEmployer.normalize(name);
                if (repository.existsByNormalizedNameAndRepresentativeName(normalized, rep)) continue;

                LocalDate excludeDate = parseDate(dateStr);
                toSave.add(new WageArrearsEmployer(rep, name, excludeDate));
            }
        }
        if (!toSave.isEmpty()) {
            repository.saveAll(toSave);
        }
        return toSave.size();
    }

    private String[] parseCsvLine(String line) {
        // 간단한 CSV: 따옴표/이스케이프 없는 단순 콤마 분리. (현재 데이터 형식에 충분)
        return line.split(",", -1);
    }

    private String stripBom(String s) {
        if (s != null && !s.isEmpty() && s.charAt(0) == '﻿') {
            return s.substring(1);
        }
        return s == null ? "" : s;
    }

    private LocalDate parseDate(String raw) {
        try {
            return raw == null || raw.isBlank() ? null : LocalDate.parse(raw, ISO);
        } catch (Exception e) {
            return null;
        }
    }
}
