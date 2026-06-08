package com.albasave.albasave_server.clientstate.repository;

import com.albasave.albasave_server.clientstate.domain.UserClientState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserClientStateRepository extends JpaRepository<UserClientState, Long> {
    Optional<UserClientState> findByUserIdAndStoreKey(Long userId, String storeKey);
}
