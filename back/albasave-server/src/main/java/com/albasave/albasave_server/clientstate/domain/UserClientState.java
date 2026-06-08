package com.albasave.albasave_server.clientstate.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 사용자별 클라이언트 상태 스냅샷 (기기간 동기화용).
 *
 * 프론트의 일부 Zustand store(신고 사건·멘토 매칭 등)는 클라이언트에서 생성·관리되는데,
 * 기기를 바꾸거나 저장소를 비우면 사라진다. 이 테이블에 (userId, storeKey)별로 JSON 한 덩어리를
 * 보관해 어느 기기에서 로그인해도 같은 데이터를 받게 한다.
 *
 * 채팅 메시지·매칭 자체는 별도 테이블(chat_message·mentorship_match)에 이미 영속되며,
 * 이 스냅샷은 클라이언트 표현 상태(목록·진행단계 등)를 기기간에 잇는 용도다.
 */
@Entity
@Table(name = "user_client_state",
        indexes = @Index(name = "ix_ucs_user_key", columnList = "user_id, store_key", unique = true))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserClientState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** store 식별자 (예: "report", "mentor-match"). */
    @Column(name = "store_key", nullable = false, length = 80)
    private String storeKey;

    /** 직렬화된 JSON 문자열 (store state). */
    @Column(columnDefinition = "TEXT")
    private String payload;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
