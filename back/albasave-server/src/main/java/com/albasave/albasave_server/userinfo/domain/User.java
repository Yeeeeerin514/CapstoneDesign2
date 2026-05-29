package com.albasave.albasave_server.userinfo.domain;

import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "\"user\"")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;   // BCrypt 해시값 저장

    @Column(name = "fcm_token")
    private String fcmToken;

    //@Column(name = "role", ) // 추후 멘토멘티 기능 코드 반영하여 user 테이블에 role 컬럼 추가 예정

    // business 테이블과 N:M 매핑
    // PartTimeJob 테이블 (다대다 관계 해소 테이블) 을 통해서만 어떤 사업장에서 일하는지 알 수 있습니다.
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    @Builder.Default
    private List<PartTimeJob> partTimeJobs = new ArrayList<>();
}