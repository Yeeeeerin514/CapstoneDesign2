package com.albasave.albasave_server.report.dto;

import com.albasave.albasave_server.workinglog.domain.PartTimeJob;

/**
 * DTO가 직접 Repository에 의존하지 않고 PartTimeJob을 조회할 수 있게 해주는 콜백.
 * 서비스가 실제 조회 구현(repository 호출)을 주입한다.
 */
@FunctionalInterface
public interface PartTimeJobLookup {
    PartTimeJob find(Long partTimeJobId);
}
