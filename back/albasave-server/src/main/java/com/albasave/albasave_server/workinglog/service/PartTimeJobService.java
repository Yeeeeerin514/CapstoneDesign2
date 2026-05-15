package com.albasave.albasave_server.workinglog.service;

import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import com.albasave.albasave_server.workinglog.dto.PartTimeJobRequest;
import com.albasave.albasave_server.workinglog.dto.PartTimeJobResponse;
import com.albasave.albasave_server.workinglog.repository.PartTimeJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PartTimeJobService {

    private final PartTimeJobRepository partTimeJobRepository;

    @Transactional
    public PartTimeJobResponse create(Long userId, PartTimeJobRequest req) {
        PartTimeJob job = PartTimeJob.builder()
                .userId(userId)
                .businessId(req.getBusinessId())
                .businessName(req.getBusinessName())
                .hourlyWage(req.getHourlyWage())
                .day(req.getDay())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .startDay(req.getStartDay())
                .endDay(req.getEndDay())
                .isActive(true)
                .build();
        return PartTimeJobResponse.from(partTimeJobRepository.save(job));
    }

    @Transactional(readOnly = true)
    public List<PartTimeJobResponse> getMyJobs(Long userId) {
        return partTimeJobRepository.findByUserId(userId)
                .stream()
                .map(PartTimeJobResponse::from)
                .toList();
    }

    @Transactional
    public void deactivate(Long userId, Long partTimeJobId) {
        PartTimeJob job = partTimeJobRepository.findById(partTimeJobId)
                .orElseThrow(() -> new IllegalArgumentException("알바를 찾을 수 없습니다."));
        if (!job.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 알바만 수정할 수 있습니다.");
        }
        job.setIsActive(false);
    }
}
