package com.albasave.albasave_server.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 최저시급 조회 — GET /api/minimum-wage?year=YYYY (permitAll, 앱 부팅 시 호출).
 * 프론트 MinimumWageResponse {year, hourlyWage, effectiveFrom}와 1:1.
 * 범위(2020~2030) 밖은 가장 가까운 연도로 클램프. 2026+ 는 앱 상수(10,030)와 일치.
 */
@RestController
@RequestMapping("/api/minimum-wage")
public class MinimumWageController {

    private static final int DEFAULT_WAGE = 10030; // 앱 MINIMUM_WAGE_2026과 일치

    @GetMapping
    public ResponseEntity<Map<String, Object>> get(
            @RequestParam(value = "year", required = false) Integer year) {
        int resolvedYear = clampYear(year != null ? year : 2026);
        return ResponseEntity.ok(Map.of(
                "year", resolvedYear,
                "hourlyWage", wageFor(resolvedYear),
                "effectiveFrom", resolvedYear + "-01-01"
        ));
    }

    private int clampYear(int y) {
        if (y < 2020) return 2020;
        if (y > 2030) return 2030;
        return y;
    }

    private int wageFor(int year) {
        return switch (year) {
            case 2020 -> 8590;
            case 2021 -> 8720;
            case 2022 -> 9160;
            case 2023 -> 9620;
            case 2024 -> 9860;
            case 2025 -> 10030;
            default -> DEFAULT_WAGE; // 2026~2030
        };
    }
}
