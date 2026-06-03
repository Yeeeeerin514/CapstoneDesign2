package com.albasave.albasave_server.payment.service;

import com.albasave.albasave_server.payment.domain.Payment;
import com.albasave.albasave_server.payment.dto.PaymentCreateRequest;
import com.albasave.albasave_server.payment.dto.PaymentResponse;
import com.albasave.albasave_server.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    /** 사건 해결 시 멘티 환급액 (PAYMENT_DISTRIBUTION.menteeRefund). */
    private static final int MENTEE_REFUND = 3000;

    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public List<PaymentResponse> myPayments(Long userId) {
        return paymentRepository.findByMenteeUserIdOrderByCreatedAtDesc(userId).stream()
                .map(PaymentResponse::from)
                .toList();
    }

    @Transactional
    public PaymentResponse record(Long userId, PaymentCreateRequest req) {
        Payment payment = Payment.builder()
                .menteeUserId(userId)
                .mentorId(req.mentorId())
                .caseId(req.caseId())
                .amount(req.amount())
                .status("paid")
                .createdAt(LocalDateTime.now())
                .build();
        return PaymentResponse.from(paymentRepository.save(payment));
    }

    @Transactional
    public PaymentResponse refund(Long userId, Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("결제 기록을 찾을 수 없습니다: " + paymentId));
        if (payment.getMenteeUserId() != null && !payment.getMenteeUserId().equals(userId)) {
            throw new IllegalArgumentException("본인 결제만 환급할 수 있습니다.");
        }
        payment.setStatus("refunded_partial");
        payment.setRefundAmount(MENTEE_REFUND);
        payment.setRefundedAt(LocalDateTime.now());
        return PaymentResponse.from(paymentRepository.save(payment));
    }
}
