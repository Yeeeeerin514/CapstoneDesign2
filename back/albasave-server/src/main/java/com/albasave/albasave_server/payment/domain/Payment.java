package com.albasave.albasave_server.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 멘토 매칭 결제 기록.
 * 실제 PG 결제는 프론트(mock provider)에서 처리하고, 본 레코드는 결과를 영속한다.
 * 프론트 features/payment 의 PaymentRecord 와 1:1 대응.
 */
@Entity
@Table(name = "payment_record")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 결제한 멘티 user.id */
    private Long menteeUserId;

    /** 멘토 식별자 (프론트가 문자열로 전달) */
    private String mentorId;

    /** 사건 id (프론트 ReportCase.id, 문자열) */
    private String caseId;

    /** 결제 금액 (원) */
    private Integer amount;

    /** "paid" | "refunded_partial" | "refunded_full" (프론트 값과 동일) */
    private String status;

    /** 환급 금액 (환급 시) */
    private Integer refundAmount;

    private LocalDateTime createdAt;
    private LocalDateTime refundedAt;
}
