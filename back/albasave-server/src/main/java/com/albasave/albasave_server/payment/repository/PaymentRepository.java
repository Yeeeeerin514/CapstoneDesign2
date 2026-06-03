package com.albasave.albasave_server.payment.repository;

import com.albasave.albasave_server.payment.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByMenteeUserIdOrderByCreatedAtDesc(Long menteeUserId);
}
