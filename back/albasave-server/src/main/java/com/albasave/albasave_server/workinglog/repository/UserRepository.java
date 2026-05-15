package com.albasave.albasave_server.workinglog.repository;

import com.albasave.albasave_server.workinglog.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long>{

}
