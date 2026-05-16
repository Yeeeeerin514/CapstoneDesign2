package com.albasave.albasave_server.contract.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "labor_contract")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LaborContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "part_time_job_id")
    private Long partTimeJobId;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "analysis_json", columnDefinition = "TEXT")
    private String analysisJson;

    /** 위반 여부 요약 */
    @Column(name = "has_violation")
    private Boolean hasViolation;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
