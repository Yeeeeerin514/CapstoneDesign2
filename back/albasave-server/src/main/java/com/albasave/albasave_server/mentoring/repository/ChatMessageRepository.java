package com.albasave.albasave_server.mentoring.repository;

import com.albasave.albasave_server.mentoring.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByMatchIdOrderByCreatedAtAsc(Long matchId);
    List<ChatMessage> findByMatchIdAndCreatedAtAfterOrderByCreatedAtAsc(
            Long matchId, LocalDateTime after);

    /** 인박스 미리보기용 — 매칭의 가장 최근 메시지 1건. */
    Optional<ChatMessage> findFirstByMatchIdOrderByCreatedAtDesc(Long matchId);

    /** 인박스 — 매칭의 총 메시지 수. */
    long countByMatchId(Long matchId);
}
