package com.albasave.albasave_server.review.service;

import com.albasave.albasave_server.review.domain.Review;
import com.albasave.albasave_server.review.dto.ReviewCreateRequest;
import com.albasave.albasave_server.review.dto.ReviewResponse;
import com.albasave.albasave_server.review.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;

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

    @Transactional(readOnly = true)
    public List<ReviewResponse> list(String industry, String region) {
        return reviewRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(r -> industry == null || industry.isBlank() || industry.equals(r.getIndustry()))
                .filter(r -> region == null || region.isBlank() || region.equals(r.getRegion()))
                .map(ReviewResponse::from)
                .toList();
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
