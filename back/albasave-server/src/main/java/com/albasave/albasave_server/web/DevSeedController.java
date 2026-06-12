package com.albasave.albasave_server.web;

import com.albasave.albasave_server.mentoring.domain.*;
import com.albasave.albasave_server.mentoring.repository.MentorProfileRepository;
import com.albasave.albasave_server.review.domain.Review;
import com.albasave.albasave_server.review.repository.ReviewRepository;
import com.albasave.albasave_server.wagearrears.domain.WageArrearsEmployer;
import com.albasave.albasave_server.wagearrears.repository.WageArrearsEmployerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 데모용 가상 데이터 시드 (개발/발표 전용).
 * /api/dev/** 는 인증 없이 접근 가능(SecurityConfig permitAll).
 * 후기는 전부 교체, 멘토는 데모 userId(9001~) 중복 없이 추가.
 *
 * 발표 후 제거 가능.
 */
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevSeedController {

    private final ReviewRepository reviewRepository;
    private final MentorProfileRepository mentorProfileRepository;
    private final WageArrearsEmployerRepository wageArrearsRepository;

    @PostMapping("/seed-demo")
    @Transactional
    public ResponseEntity<Map<String, Object>> seedDemo() {
        int reviews = seedReviews();
        int mentorsAdded = seedMentors();
        int wageArrears = seedWageArrears();
        return ResponseEntity.ok(Map.of(
                "reviews", reviews,
                "mentorsAdded", mentorsAdded,
                "wageArrears", wageArrears,
                "message", "데모 데이터 시드 완료"
        ));
    }

    // ── 체불사업주 명단: 데모용 가상 사업장 1건(실존 업체 아님) ──
    // 데모 공고(데일리브루 명륜점)를 분석하면 "체불사업주 명단 후보"로 뜨도록.
    // 매칭은 normalizedName 부분 일치라 추출명이 "데일리브루"든 "데일리브루 명륜점"이든 잡힌다.
    private int seedWageArrears() {
        String businessName = "데일리브루 명륜점";
        String representative = "홍길동"; // 명백한 가명
        String norm = WageArrearsEmployer.normalize(businessName);
        if (wageArrearsRepository.existsByNormalizedNameAndRepresentativeName(norm, representative)) {
            return 0;
        }
        wageArrearsRepository.save(
                new WageArrearsEmployer(representative, businessName, LocalDate.of(2026, 3, 2)));
        return 1;
    }

    // ── 후기: 정크 포함 전부 비우고 다양한 한글 후기로 재구성 ──
    private int seedReviews() {
        reviewRepository.deleteAll();
        List<Review> list = List.of(
                review("닉네임A", "🛡 인증멘토", "카페·음식점", "서울", "주휴수당 미지급",
                        "노동청 진정", "100만원대", 18, 4.8, "2주만에 해결했어요, 진정서 이렇게 쓰세요",
                        "처음엔 막막했는데 진정서를 정확히 쓰니 노동청이 빠르게 움직였어요. 출석조사 통보 받고 사장 태도가 바뀌더라고요.",
                        "날짜와 금액을 정확히 적으세요. 법 조항은 몰라도 됩니다",
                        "출석조사 때 통장 내역 꼭 지참하세요",
                        "버티면 형사 고소 언급만 해도 달라져요", 24, true, "9001", 18),
                review("성실한알바생", "", "편의점", "경기", "임금(기본급) 미지급",
                        "노동청 진정", "50만원대", 21, 5.0, "출석조사 한 번에 3주 만에 전액 받았어요",
                        "통장 내역과 근무기록까지 첨부해서 제출했더니 출석조사 한 번에 시정지시가 떨어졌습니다.",
                        "통장 내역과 근무기록을 같이 첨부하면 빨라요", "", "", 31, false, null, 21),
                review("배달3년차라이더", "", "배달·물류", "인천", "연장근로수당 미지급",
                        "합의", "200만원대", 12, 4.6, "야간·연장수당 떼인 거 합의로 받아냈습니다",
                        "라이더도 근로자성 인정받을 수 있어요. 배달 기록 캡처가 핵심 증거였습니다.",
                        "운행 기록·배차 내역을 미리 캡처해두세요", "", "합의 시 지급 날짜를 문서로 남기세요", 17, true, "9003", 12),
                review("야간조퇴사자", "", "음식점", "서울", "야간근로수당 미지급",
                        "지급명령", "80만원대", 30, 4.4, "지급명령으로 받은 후기",
                        "사장이 연락을 피해서 지급명령 신청했어요. 생각보다 절차가 간단했습니다.",
                        "내용증명 먼저 보내면 지급명령이 수월해요", "", "", 9, false, null, 30),
                review("열정학원쌤", "🛡 인증멘토", "학원·교육", "부산", "퇴직금 미지급",
                        "노무사 상담", "500만원 이상", 45, 5.0, "퇴직금 + 미지급 강사료까지 전액 회수",
                        "금액이 커서 노무사 상담을 받았어요. 1년 이상 근무면 퇴직금 대상이라는 걸 그때 알았습니다.",
                        "근로계약서·급여명세서를 모아두세요", "출석조사에 노무사 동행 가능해요", "사업주가 폐업 운운하면 대지급금 제도 알아보세요", 28, true, "9004", 45),
                review("편의점돌이", "", "편의점", "대구", "주휴수당 미지급",
                        "노동청 진정", "30만원대", 14, 4.3, "주휴수당도 당당히 요구하세요",
                        "주 15시간 이상이면 주휴수당 대상이에요. 작은 금액도 노동청은 다뤄줍니다.",
                        "주당 근무시간을 표로 정리해 제출하세요", "", "", 5, false, null, 14),
                review("카페에서싸운사람", "", "카페·음식점", "경기", "임금(기본급) 미지급",
                        "노동청 진정", "120만원대", 16, 4.7, "최저임금 미달까지 같이 신고했어요",
                        "시급이 최저임금보다 낮았는데 그 차액도 체불로 인정받았습니다.",
                        "최저임금 위반은 차액도 청구 가능해요", "", "", 13, false, null, 16),
                review("마트장기근무", "", "마트·판매", "서울", "연장근로수당 미지급",
                        "합의", "60만원대", 25, 4.5, "마감 연장근무 수당 받아낸 후기",
                        "매일 30분씩 연장근무가 누적됐는데 출퇴근 기록으로 증명했어요.",
                        "출퇴근 시각을 매일 기록해두면 강력한 증거가 됩니다", "", "", 7, false, null, 25)
        );
        reviewRepository.saveAll(list);
        return list.size();
    }

    private Review review(String nick, String badges, String industry, String region, String damageType,
                          String method, String amount, int days, double rating, String title, String content,
                          String tipC, String tipI, String tipN, int helpful, boolean isMentor,
                          String mentorUserId, int createdDaysAgo) {
        return Review.builder()
                .authorNickname(nick).authorBadges(badges).industry(industry).region(region)
                .damageTypes(damageType).resolutionMethod(method).unpaidAmountRange(amount)
                .resolveDays(days).rating(rating).title(title).content(content)
                .tipComplaint(tipC).tipInvestigation(tipI).tipNegotiation(tipN)
                .helpfulCount(helpful).isMentor(isMentor).mentorUserId(mentorUserId)
                .createdAt(LocalDateTime.now().minusDays(createdDaysAgo))
                .build();
    }

    // ── 멘토: 데모 userId(9001~) 중복 없이 추가 (ADMIN_VERIFIED → 매칭 풀 포함) ──
    private int seedMentors() {
        int added = 0;
        added += addMentor(9001L, "카페알바해결사", Industry.FOOD_SERVICE,
                List.of(DamageType.WAGE_ARREARS, DamageType.WEEKLY_HOLIDAY),
                EmploymentType.LONG_TERM_PART_TIME, BusinessSize.UNDER_5, Region.SEOUL,
                List.of(ResolutionMethod.LABOR_OFFICE_REPORT), DamageAmountRange.KRW_500K_1M,
                "카페 알바 5년, 주휴·임금체불 진정 다수 해결. 진정서 작성 도와드려요.", 4.9, 12, 10000) ? 1 : 0;
        added += addMentor(9002L, "편의점지킴이", Industry.CONVENIENCE_RETAIL,
                List.of(DamageType.WAGE_ARREARS, DamageType.OVERTIME_PAY),
                EmploymentType.SHORT_TERM_PART_TIME, BusinessSize.UNDER_5, Region.GYEONGGI,
                List.of(ResolutionMethod.LABOR_OFFICE_REPORT, ResolutionMethod.SETTLEMENT), DamageAmountRange.KRW_100K_500K,
                "편의점 야간 근무 경험 多. 소액 체불도 끝까지 받아드립니다.", 4.7, 8, 10000) ? 1 : 0;
        added += addMentor(9003L, "배달기사권리찾기", Industry.DELIVERY,
                List.of(DamageType.OVERTIME_PAY, DamageType.INDUSTRIAL_ACCIDENT),
                EmploymentType.FREELANCE, BusinessSize.UNKNOWN, Region.INCHEON,
                List.of(ResolutionMethod.LABOR_OFFICE_REPORT), DamageAmountRange.KRW_1M_5M,
                "배달 라이더 근로자성·산재 상담. 운행기록 증거화 노하우 공유.", 4.8, 15, 10000) ? 1 : 0;
        added += addMentor(9004L, "학원강사노무사친구", Industry.EDUCATION,
                List.of(DamageType.WAGE_ARREARS, DamageType.SEVERANCE_PAY),
                EmploymentType.CONTRACT, BusinessSize.SIZE_5_TO_30, Region.BUSAN,
                List.of(ResolutionMethod.LABOR_ATTORNEY, ResolutionMethod.CIVIL_LAWSUIT), DamageAmountRange.OVER_5M,
                "학원 강사료·퇴직금 미지급 다수 해결. 고액 사건 경험 풍부.", 5.0, 21, 15000) ? 1 : 0;
        added += addMentor(9005L, "음식점홀매니저", Industry.FOOD_SERVICE,
                List.of(DamageType.WAGE_ARREARS, DamageType.WEEKLY_HOLIDAY, DamageType.OVERTIME_PAY),
                EmploymentType.LONG_TERM_PART_TIME, BusinessSize.SIZE_5_TO_30, Region.SEOUL,
                List.of(ResolutionMethod.LABOR_OFFICE_REPORT, ResolutionMethod.PAYMENT_ORDER), DamageAmountRange.KRW_500K_1M,
                "음식점 홀·주방 알바 노무 상담. 지급명령까지 안내 가능.", 4.6, 9, 10000) ? 1 : 0;
        added += addMentor(9006L, "마트단기알바선배", Industry.CONVENIENCE_RETAIL,
                List.of(DamageType.WEEKLY_HOLIDAY),
                EmploymentType.SHORT_TERM_PART_TIME, BusinessSize.OVER_30, Region.DAEGU,
                List.of(ResolutionMethod.SETTLEMENT), DamageAmountRange.UNDER_100K,
                "단기·주말 알바 주휴수당 상담. 소액도 포기하지 마세요.", 4.5, 6, 8000) ? 1 : 0;
        return added;
    }

    private boolean addMentor(Long userId, String nickname, Industry industry, List<DamageType> damageTypes,
                              EmploymentType employmentType, BusinessSize businessSize, Region region,
                              List<ResolutionMethod> methods, DamageAmountRange amountRange, String bio,
                              double rating, int reviewCount, int fee) {
        if (mentorProfileRepository.existsByUserId(userId)) return false;
        mentorProfileRepository.save(MentorProfile.builder()
                .userId(userId).nickname(nickname).industry(industry).damageTypes(damageTypes)
                .employmentType(employmentType).businessSize(businessSize).region(region)
                .resolutionMethods(methods).damageAmountRange(amountRange).bio(bio)
                .isVerified(true).averageRating(rating).reviewCount(reviewCount)
                .capacity(5).currentMenteeCount(0).consultingFee(fee)
                .verificationMethod(VerificationMethod.ADMIN_VERIFIED)
                .verifiedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build());
        return true;
    }
}
