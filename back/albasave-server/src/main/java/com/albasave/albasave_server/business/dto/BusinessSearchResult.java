package com.albasave.albasave_server.business.dto;

/**
 * 사업장 검색 결과 1건. 프론트 BusinessSearchResult(entities/business/model/types.ts)와 1:1.
 * representative·laborOffice는 공공 인허가 데이터에 없어 null로 내려간다(프론트가 null 허용).
 */
public record BusinessSearchResult(
        String businessRegistrationNumber,
        String name,
        String category,
        String address,
        String phone,
        String representative,
        String laborOffice
) {}
