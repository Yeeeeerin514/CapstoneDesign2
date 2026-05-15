package com.albasave.albasave_server.workinglog.repository;

import com.albasave.albasave_server.workinglog.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
