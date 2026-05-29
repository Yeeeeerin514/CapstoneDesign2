package com.albasave.albasave_server.mentoring.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 멘토-멘티 1:1 채팅 메시지 (영속).
 * MentorshipMatch에 종속. polling 기반 fetch.
 */
@Entity
@Table(name = "chat_message",
        indexes = {
                @Index(name = "ix_chat_match_created", columnList = "match_id, created_at")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    /** 발신자 userId. system 메시지는 null. */
    @Column(name = "sender_user_id")
    private Long senderUserId;

    /** "MENTOR" | "MENTEE" | "SYSTEM" */
    @Column(name = "sender_role", nullable = false, length = 20)
    private String senderRole;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
