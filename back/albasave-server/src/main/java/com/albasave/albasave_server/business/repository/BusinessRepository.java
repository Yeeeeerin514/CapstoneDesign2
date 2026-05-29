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

    long countBySourceFileIn(Collection<String> sourceFiles);
}
