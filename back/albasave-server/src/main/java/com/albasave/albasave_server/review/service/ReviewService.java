package com.albasave.albasave_server.review.service;

import com.albasave.albasave_server.review.domain.Review;
import com.albasave.albasave_server.review.domain.ReviewComment;
import com.albasave.albasave_server.review.dto.ReviewCommentCreateRequest;
import com.albasave.albasave_server.review.dto.ReviewCommentResponse;
import com.albasave.albasave_server.review.dto.ReviewCreateRequest;
import com.albasave.albasave_server.review.dto.ReviewResponse;
import com.albasave.albasave_server.review.repository.ReviewCommentRepository;
import com.albasave.albasave_server.review.repository.ReviewRepository;
import com.albasave.albasave_server.userinfo.domain.User;
import com.albasave.albasave_server.userinfo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    /** 지역 필터 "기타" = 아래 광역지역에 속하지 않는 모든 후기. */
    private static final Set<String> NAMED_REGIONS = Set.of("서울", "경기");

    private final ReviewRepository reviewRepository;
    private final ReviewCommentRepository reviewCommentRepository;
    private final UserRepository userRepository;

    /** 앱 시작 시 후기 테이블이 비어 있으면 데모 후기 2건 시드. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedIfEmpty() {
        if (reviewRepository.count() > 0) return;
        reviewRepository.save(Review.builder()
                .authorUserId(null)
                .authorNickname("닉네임A")
                .authorBadges("🛡 인증멘토,⚡ 빠른해결")
                .industry("카페·음식점")
                .region("서울")
                .damageType("주휴수당 미지급")
                .resolutionMethod("노동청 진정")
                .unpaidAmountRange("100만원대")
                .resolveDays(18)
                .rating(4.8)
                .title("2주만에 해결했어요, 진정서 이렇게 쓰세요")
                .content("처음에는 너무 막막했는데, 진정서를 정확하게 쓰니까 노동청에서도 빠르게 움직였습니다. 사장님이 처음엔 무시했지만 출석조사 통보를 받고 나서 태도가 바뀌더라고요.")
                .tipComplaint("날짜와 금액을 정확히, 법 조항은 몰라도 됩니다")
                .tipInvestigation("출석조사 때 통장 내역 꼭 지참하세요")
                .tipNegotiation("사업주가 버티면 형사 고소 언급만 해도 달라져요")
                .helpfulCount(24)
                .isMentor(true)
                .mentorUserId(null)
                .createdAt(LocalDateTime.now().minusDays(20))
                .build());
        reviewRepository.save(Review.builder()
                .authorUserId(null)
                .authorNickname("닉네임B")
                .authorBadges("")
                .industry("편의점")
                .region("경기")
                .damageType("임금(기본급) 미지급")
                .resolutionMethod("노동청 진정")
                .unpaidAmountRange("50만원대")
                .resolveDays(21)
                .rating(5.0)
                .title("출석조사 한 번에 끝내고 3주 만에 전액 수령")
                .content("사장님이 처음엔 못 준다고 버텼는데, 진정서에 통장 내역과 근무기록까지 첨부해서 제출했더니 출석조사 한 번에 시정지시가 떨어졌어요.")
                .tipComplaint("통장 내역과 근무기록을 같이 첨부하면 빨라요")
                .tipInvestigation("")
                .tipNegotiation("")
                .helpfulCount(31)
                .isMentor(false)
                .mentorUserId(null)
                .createdAt(LocalDateTime.now().minusDays(30))
                .build());
        log.info("[Review] 데모 후기 2건 시드 완료");
    }

    /**
     * 후기 목록(최신순) — 업종/지역 옵션 필터.
     * <ul>
     *   <li>industry: null/빈값/"전체"이면 전체, 아니면 정확히 일치하는 업종만</li>
     *   <li>region: null/빈값/"전체"이면 전체, "기타"이면 서울·경기가 <b>아닌</b> 후기,
     *       그 외("서울"/"경기")는 정확히 일치하는 지역만</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public List<ReviewResponse> list(String industry, String region) {
        return reviewRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(r -> matchesIndustry(r, industry))
                .filter(r -> matchesRegion(r, region))
                .map(ReviewResponse::from)
                .toList();
    }

    private boolean matchesIndustry(Review r, String industry) {
        if (industry == null || industry.isBlank() || "전체".equals(industry)) return true;
        return industry.equals(r.getIndustry());
    }

    private boolean matchesRegion(Review r, String region) {
        if (region == null || region.isBlank() || "전체".equals(region)) return true;
        if ("기타".equals(region)) return !NAMED_REGIONS.contains(r.getRegion());
        return region.equals(r.getRegion());
    }

    /** 단건 후기 조회. */
    @Transactional(readOnly = true)
    public ReviewResponse getOne(Long id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("후기를 찾을 수 없습니다: " + id));
        return ReviewResponse.from(review);
    }

    /** 단건 후기의 Q&A 댓글 목록(작성 순). 모든 사용자에게 동일하게 노출. */
    @Transactional(readOnly = true)
    public List<ReviewCommentResponse> listComments(Long reviewId) {
        if (!reviewRepository.existsById(reviewId)) {
            throw new IllegalArgumentException("후기를 찾을 수 없습니다: " + reviewId);
        }
        return reviewCommentRepository.findByReviewIdOrderByCreatedAtAsc(reviewId).stream()
                .map(ReviewCommentResponse::from)
                .toList();
    }

    /**
     * Q&A 댓글 작성.
     * 닉네임은 JWT(userId)로 User를 조회해 서버에서 채우고,
     * 작성자 본인 여부(isAuthor)는 후기의 작성자 user.id와 비교해 판별한다.
     */
    @Transactional
    public ReviewCommentResponse createComment(Long userId, Long reviewId, ReviewCommentCreateRequest req) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("후기를 찾을 수 없습니다: " + reviewId));

        if (req.body() == null || req.body().isBlank()) {
            throw new IllegalArgumentException("댓글 내용을 입력해주세요.");
        }

        String nickname = userRepository.findById(userId)
                .map(User::getName)
                .orElse("알 수 없음");
        boolean isAuthor = review.getAuthorUserId() != null
                && review.getAuthorUserId().equals(userId);

        ReviewComment comment = ReviewComment.builder()
                .reviewId(reviewId)
                .authorUserId(userId)
                .authorNickname(nickname)
                .isAuthor(isAuthor)
                .body(req.body().trim())
                .createdAt(LocalDateTime.now())
                .build();
        return ReviewCommentResponse.from(reviewCommentRepository.save(comment));
    }

    @Transactional
    public ReviewResponse create(Long userId, ReviewCreateRequest req) {
        Review review = Review.builder()
                .authorUserId(userId)
                .authorNickname(req.authorNickname())
                .authorBadges(req.authorBadges() == null ? "" : String.join(",", req.authorBadges()))
                .industry(req.industry())
                .region(req.region())
                .damageType(req.damageType())
                .resolutionMethod(req.resolutionMethod())
                .unpaidAmountRange(req.unpaidAmountRange())
                .resolveDays(req.resolveDays())
                .rating(req.rating())
                .title(req.title())
                .content(req.content())
                .tipComplaint(req.tips() != null ? req.tips().complaint() : "")
                .tipInvestigation(req.tips() != null ? req.tips().investigation() : "")
                .tipNegotiation(req.tips() != null ? req.tips().negotiation() : "")
                .helpfulCount(0)
                .isMentor(req.isMentor())
                .mentorUserId(req.mentorUserId())
                .createdAt(LocalDateTime.now())
                .build();
        return ReviewResponse.from(reviewRepository.save(review));
    }

    @Transactional
    public ReviewResponse markHelpful(Long id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("후기를 찾을 수 없습니다: " + id));
        int current = review.getHelpfulCount() == null ? 0 : review.getHelpfulCount();
        review.setHelpfulCount(current + 1);
        return ReviewResponse.from(reviewRepository.save(review));
    }
}
