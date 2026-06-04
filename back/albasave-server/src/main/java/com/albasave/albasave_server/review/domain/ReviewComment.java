package com.albasave.albasave_server.review.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 후기 Q&A 댓글.
 * 단건 후기 하단에서 "작성자에게 궁금한 점을 물어보는" 커뮤니티 영역.
 * 프론트 ReviewDetailView 의 QnaComment 모델과 1:1 대응.
 */
@Entity
@Table(name = "review_comment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 어떤 후기에 달린 댓글인지 — resolve_review.id */
    private Long reviewId;

    /** 댓글 작성자 user.id */
    private Long authorUserId;

    /** 작성 시점의 작성자 닉네임(스냅샷). 목록 조회 시 User 조인 불필요. */
    private String authorNickname;

    /** 이 댓글 작성자가 후기 원작성자(=작성자 본인)인지 여부. UI에서 "작성자" 배지/파란 배경 표시. */
    private Boolean isAuthor;

    @Column(length = 1000)
    private String body;

    private LocalDateTime createdAt;
}
