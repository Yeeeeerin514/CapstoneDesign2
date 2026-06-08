package com.albasave.albasave_server.business.dto;

import java.util.List;

/** GET /api/businesses/search 응답. 프론트 BusinessSearchResponse와 1:1. */
public record BusinessSearchResponse(
        List<BusinessSearchResult> results,
        int total
) {}
