package com.albasave.albasave_server.review.controller;

import com.albasave.albasave_server.review.dto.ReviewCreateRequest;
import com.albasave.albasave_server.review.dto.ReviewResponse;
import com.albasave.albasave_server.review.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 해결 후기 API.
 * <pre>
 *   GET    /api/reviews?industry=&region=   후기 목록 (최신순, 옵션 필터)
 *   POST   /api/reviews                      후기 작성
 *   POST   /api/reviews/{id}/helpful         "도움됐어요" +1
 * </pre>
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ResponseEntity<List<ReviewResponse>> list(
            @RequestParam(value = "industry", required = false) String industry,
            @RequestParam(value = "region", required = false) String region) {
        return ResponseEntity.ok(reviewService.list(industry, region));
    }

    @PostMapping
    public ResponseEntity<ReviewResponse> create(
            @AuthenticationPrincipal Long userId,
            @RequestBody ReviewCreateRequest req) {
        return ResponseEntity.ok(reviewService.create(userId, req));
    }

    @PostMapping("/{id}/helpful")
    public ResponseEntity<ReviewResponse> markHelpful(@PathVariable Long id) {
        return ResponseEntity.ok(reviewService.markHelpful(id));
    }
}
