package com.albasave.albasave_server.workinglog.repository;

import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import com.albasave.albasave_server.workinglog.domain.PartTimeJobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PartTimeJobRepository extends JpaRepository<PartTimeJob, Long> {

    /** 특정 사용자의 활성 알바 목록 */
    List<PartTimeJob> findByUserIdAndIsActiveTrue(Long userId);

    /** 특정 사용자의 전체 알바 목록 */
    List<PartTimeJob> findByUserId(Long userId);

    /**
     * 오늘 요일 bit AND 연산으로 출근 대상자 조회 (알림 스케줄러용)
     * 예) todayBit = 1 (월요일) → days & 1 > 0 인 활성 레코드만 반환
     */
    @Query(value = "SELECT * FROM part_time_job WHERE (days & :todayBit) > 0 AND is_active = true", nativeQuery = true)
    List<PartTimeJob> findTodayActiveWorkers(@Param("todayBit") int todayBit);

    /** 스케줄러: 전체 활성 알바 목록 (알림 발송 대상 조회) */
    List<PartTimeJob> findAllByIsActiveTrue();

    /**
     * 특정 유저의 특정 알바 조회 (권한 검증용)
     * user는 @ManyToOne 객체이므로 user_id 컬럼 접근 시 User_Id로 명시
     */
    Optional<PartTimeJob> findByIdAndUser_Id(Long id, Long userId);

    /**
     * 관심업장(FAVORITE) 목록 — 프론트 관심업장 탭 조회용.
     * 최근 추가 순.
     */
    List<PartTimeJob> findByUser_IdAndStatusOrderByIdDesc(Long userId, PartTimeJobStatus status);

    /**
     * 등록된 근무업장(REGISTERED) 목록 — 프론트 근무업장 탭 조회용.
     * status 가 null 인 레거시 행도 등록된 알바로 간주해 함께 반환한다.
     */
    @Query("SELECT p FROM PartTimeJob p WHERE p.user.id = :userId "
            + "AND (p.status = com.albasave.albasave_server.workinglog.domain.PartTimeJobStatus.REGISTERED OR p.status IS NULL) "
            + "ORDER BY p.id DESC")
    List<PartTimeJob> findRegisteredByUser(@Param("userId") Long userId);

    /**
     * 업장명 기준 중복 관심업장 판단용 — 같은 유저의 동일 businessName + status 조회.
     * (중복 판단 기준: 업장명)
     */
    Optional<PartTimeJob> findFirstByUser_IdAndBusinessNameAndStatus(
            Long userId, String businessName, PartTimeJobStatus status);
}
