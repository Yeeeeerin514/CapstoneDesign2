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

    @Query("""
            select b
            from Business b
            where (:name is not null and b.name like concat('%', :name, '%'))
               or (:address is not null and b.roadAddress like concat('%', :address, '%'))
               or (:address is not null and b.localAddress like concat('%', :address, '%'))
               or (:phone is not null and b.phone like concat('%', :phone, '%'))
            """)
    List<Business> searchCandidates(
            @Param("name") String name,
            @Param("address") String address,
            @Param("phone") String phone,
            Pageable pageable
    );

    default List<Business> searchCandidates(String name, String address, String phone) {
        return searchCandidates(name, address, phone, Pageable.ofSize(200));
    }

    long countBySourceFileIn(Collection<String> sourceFiles);
}
