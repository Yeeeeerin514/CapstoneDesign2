package com.albasave.albasave_server.lawapi.controller;

import com.albasave.albasave_server.lawapi.dto.LawChunkMatch;
import com.albasave.albasave_server.lawapi.service.LegalContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * RAG 검증용 디버그 엔드포인트.
 * 운영 단계에서 보안 강화 시 SecurityConfig에서 제한하거나 /actuator 하위로 옮길 것.
 */
@RestController
@RequestMapping("/api/dev/rag")
@RequiredArgsConstructor
public class RagDebugController {

    private final LegalContextService legalContextService;

    /**
     * 자유 텍스트로 관련 법령 조문 의미 검색.
     * 예: GET /api/dev/rag/search?q=주 15시간 이상 근무 시 주휴수당&topK=3
     */
    @GetMapping("/search")
    public Map<String, Object> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int topK
    ) {
        List<LawChunkMatch> matches = legalContextService.searchSimilar(q, topK);
        return Map.of(
                "query", q,
                "topK", topK,
                "count", matches.size(),
                "matches", matches.stream().map(m -> Map.of(
                        "lawName", m.lawName(),
                        "article", m.articleNumber(),
                        "title", m.articleTitle() == null ? "" : m.articleTitle(),
                        "partNo", m.partNo(),
                        "distance", String.format("%.4f", m.distance()),
                        "preview", m.content().length() > 200
                                ? m.content().substring(0, 200) + " …"
                                : m.content()
                )).toList()
        );
    }
}
