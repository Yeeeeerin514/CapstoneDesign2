package com.albasave.albasave_server.business.repository;

import com.albasave.albasave_server.business.domain.Business;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BusinessRepository extends JpaRepository<Business, Long> {
    Optional<Business> findBySourceFileAndManagementNumber(String sourceFile, String managementNumber);

    /** 관리번호로 사업장 1건 조회 (관리번호는 sourceFile과 조합 시 유일 — 단독 조회는 첫 건 사용) */
    Optional<Business> findFirstByManagementNumber(String managementNumber);

    /**
     * Null 대신 빈 문자열을 받는다. JPQL 파라미터의 PostgreSQL 타입 추론 실패를
     * 막기 위함. 빈 문자열은 "조건 미적용"으로 해석된다.
     */
    @Query("""
            select b
            from Business b
            where (:name <> '' and b.name like concat('%', :name, '%'))
               or (:address <> '' and b.roadAddress like concat('%', :address, '%'))
               or (:address <> '' and b.localAddress like concat('%', :address, '%'))
               or (:phone <> '' and b.phone like concat('%', :phone, '%'))
            """)
    List<Business> searchCandidates(
            @Param("name") String name,
            @Param("address") String address,
            @Param("phone") String phone,
            Pageable pageable
    );

    default List<Business> searchCandidates(String name, String address, String phone) {
        return searchCandidates(
                name == null ? "" : name,
                address == null ? "" : address,
                phone == null ? "" : phone,
                Pageable.ofSize(200)
        );
    }

    /**
     * 사용자 사업장 검색 — 이름 AND 지역(도로명/지번) 모두 만족하는 사업장.
     * (searchCandidates는 매칭 후보용 OR 검색이라 검색 화면엔 부적합 → AND 전용 쿼리.)
     * 빈 문자열 파라미터는 "조건 미적용"으로 해석(PostgreSQL 타입 추론 실패 회피).
     */
    @Query("""
            select b
            from Business b
            where (:name = '' or b.name like concat('%', :name, '%'))
              and (:region = '' or b.roadAddress like concat('%', :region, '%')
                   or b.localAddress like concat('%', :region, '%'))
            """)
    List<Business> searchByNameAndRegion(
            @Param("name") String name,
            @Param("region") String region,
            Pageable pageable
    );

    long countBySourceFileIn(Collection<String> sourceFiles);

    /**
     * 사업자등록번호로 사업장 조회
     */
    Optional<Business> findByManagementNumber(String businessRegistrationNum);
}
