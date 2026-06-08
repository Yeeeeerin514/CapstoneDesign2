package com.albasave.albasave_server.business.controller;

import com.albasave.albasave_server.business.domain.Business;
import com.albasave.albasave_server.business.dto.BusinessSearchResponse;
import com.albasave.albasave_server.business.dto.BusinessSearchResult;
import com.albasave.albasave_server.business.repository.BusinessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 사업장 검색 — 신고할 사업장을 이름·지역으로 찾아 사업자번호를 연결한다.
 * 프론트 BusinessSearchView(GET /api/businesses/search?q=&region=)가 사용.
 * 인허가 공공데이터(businesses 테이블, 공고분석에서 사용하는 동일 소스) 기반.
 */
@RestController
@RequestMapping("/api/businesses")
@RequiredArgsConstructor
public class BusinessSearchController {

    private static final int MAX_RESULTS = 20;

    private final BusinessRepository businessRepository;

    @GetMapping("/search")
    public ResponseEntity<BusinessSearchResponse> search(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "region", required = false) String region) {

        String name = q == null ? "" : q.trim();
        String reg = region == null ? "" : region.trim();

        // 둘 다 비면 전체 스캔 방지 — 빈 결과.
        if (name.isEmpty() && reg.isEmpty()) {
            return ResponseEntity.ok(new BusinessSearchResponse(List.of(), 0));
        }

        List<Business> found = businessRepository.searchByNameAndRegion(
                name, reg, PageRequest.of(0, MAX_RESULTS));

        List<BusinessSearchResult> results = found.stream()
                .map(this::toResult)
                .collect(Collectors.toList());

        return ResponseEntity.ok(new BusinessSearchResponse(results, results.size()));
    }

    private BusinessSearchResult toResult(Business b) {
        String address = b.getRoadAddress() != null && !b.getRoadAddress().isBlank()
                ? b.getRoadAddress()
                : b.getLocalAddress();
        return new BusinessSearchResult(
                b.getManagementNumber(), // 사업자/관리번호
                b.getName(),
                b.getIndustry(),         // 업종 → category
                address,
                b.getPhone(),
                null,                    // representative — 공공데이터에 없음
                null                     // laborOffice — 공공데이터에 없음
        );
    }
}
