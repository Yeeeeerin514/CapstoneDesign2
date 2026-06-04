package com.albasave.albasave_server.review.repository;

import com.albasave.albasave_server.review.domain.ReviewComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewCommentRepository extends JpaRepository<ReviewComment, Long> {
    /** 특정 후기의 Q&A 댓글을 작성 순(오래된 → 최신)으로 조회. */
    List<ReviewComment> findByReviewIdOrderByCreatedAtAsc(Long reviewId);
}
