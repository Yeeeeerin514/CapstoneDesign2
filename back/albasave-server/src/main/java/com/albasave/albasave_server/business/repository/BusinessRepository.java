package com.albasave.albasave_server.business.repository;

import com.albasave.albasave_server.business.domain.Business;
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
            where (:name is null or b.name like concat('%', :name, '%'))
               or (:address is null or b.roadAddress like concat('%', :address, '%'))
               or (:address is null or b.localAddress like concat('%', :address, '%'))
            """)
    List<Business> searchCandidates(@Param("name") String name, @Param("address") String address);

    long countBySourceFileIn(Collection<String> sourceFiles);
}
