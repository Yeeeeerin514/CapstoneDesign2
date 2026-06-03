package com.albasave.albasave_server.payment.controller;

import com.albasave.albasave_server.payment.dto.PaymentCreateRequest;
import com.albasave.albasave_server.payment.dto.PaymentResponse;
import com.albasave.albasave_server.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 결제 기록 API (실제 PG 는 프론트 mock provider, 본 API 는 기록 영속).
 * <pre>
 *   GET    /api/payments/me            내 결제 기록
 *   POST   /api/payments               결제 기록 생성 (mock 결제 성공 후)
 *   POST   /api/payments/{id}/refund   사건 해결 후 부분 환급
 * </pre>
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/me")
    public ResponseEntity<List<PaymentResponse>> myPayments(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(paymentService.myPayments(userId));
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> record(
            @AuthenticationPrincipal Long userId,
            @RequestBody PaymentCreateRequest req) {
        return ResponseEntity.ok(paymentService.record(userId, req));
    }

    @PostMapping("/{id}/refund")
    public ResponseEntity<PaymentResponse> refund(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(paymentService.refund(userId, id));
    }
}
