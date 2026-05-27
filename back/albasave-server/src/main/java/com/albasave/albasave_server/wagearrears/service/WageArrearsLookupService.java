package com.albasave.albasave_server.wagearrears.service;

import com.albasave.albasave_server.jobposting.dto.ExternalRiskCheck;
import com.albasave.albasave_server.wagearrears.domain.WageArrearsEmployer;
import com.albasave.albasave_server.wagearrears.repository.WageArrearsEmployerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 체불사업주 명단(고용노동부 공개) DB 조회.
 * 외부 API 대신 사전 임포트된 CSV 기반 DB를 사용한다.
 */
@Service
@RequiredArgsConstructor
public class WageArrearsLookupService {

    private final WageArrearsEmployerRepository repository;

    @Transactional(readOnly = true)
    public ExternalRiskCheck check(String businessName) {
        if (businessName == null || businessName.isBlank()) {
            return new ExternalRiskCheck(
                    "WAGE_ARREARS_DB",
                    "SKIPPED",
                    "체불사업주 명단 조회 생략",
                    "공고문에서 사업장명을 확인하지 못해 체불사업주 명단 조회를 수행하지 않았습니다.",
                    "businessName 없음"
            );
        }
        String normalized = WageArrearsEmployer.normalize(businessName);
        if (normalized.isBlank()) {
            return new ExternalRiskCheck(
                    "WAGE_ARREARS_DB",
                    "SKIPPED",
                    "체불사업주 명단 조회 생략",
                    "정규화 후 비어있는 이름이라 조회를 수행하지 않았습니다.",
                    "normalized 비어있음"
            );
        }

        List<WageArrearsEmployer> matches = repository.findByNormalizedNameContaining(normalized);
        if (matches.isEmpty()) {
            return new ExternalRiskCheck(
                    "WAGE_ARREARS_DB",
                    "CLEAR",
                    "체불사업주 명단 조회 완료",
                    "고용노동부 체불사업주 명단공개 데이터에서 직접 일치하는 사업장명이 발견되지 않았습니다.",
                    "keyword=" + businessName
            );
        }

        String top = matches.stream().limit(3)
                .map(m -> m.getBusinessName() + "(대표 " + m.getRepresentativeName() + ")")
                .reduce((a, b) -> a + ", " + b)
                .orElse("");
        return new ExternalRiskCheck(
                "WAGE_ARREARS_DB",
                "RISK",
                "체불사업주 명단 후보",
                "고용노동부 체불사업주 명단공개 데이터에서 유사 사업장명이 " + matches.size() + "건 확인되었습니다. 대표자명/주소로 재확인이 필요합니다.",
                "matches=" + top
        );
    }
}
