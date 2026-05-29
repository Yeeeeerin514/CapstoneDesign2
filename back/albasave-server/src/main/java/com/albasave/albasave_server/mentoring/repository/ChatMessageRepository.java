package com.albasave.albasave_server.mentoring.repository;

import com.albasave.albasave_server.mentoring.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByMatchIdOrderByCreatedAtAsc(Long matchId);
    List<ChatMessage> findByMatchIdAndCreatedAtAfterOrderByCreatedAtAsc(
            Long matchId, LocalDateTime after);
}
