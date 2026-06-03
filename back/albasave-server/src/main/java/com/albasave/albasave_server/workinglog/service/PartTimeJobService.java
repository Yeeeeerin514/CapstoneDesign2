package com.albasave.albasave_server.workinglog.service;

import com.albasave.albasave_server.business.domain.Business;
import com.albasave.albasave_server.business.repository.BusinessRepository;
import com.albasave.albasave_server.userinfo.domain.User;
import com.albasave.albasave_server.userinfo.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;

    @Transactional
    public PartTimeJobResponse create(Long userId, PartTimeJobRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));
        Business business = req.getBusinessId() != null
                ? businessRepository.findById(req.getBusinessId()).orElse(null)
                : null;

        PartTimeJob job = PartTimeJob.builder()
                .user(user)
                .business(business)
                .businessName(req.getBusinessName())
                .hourlyWage(req.getHourlyWage())
                .days(PartTimeJobResponse.dayStringToBitmask(req.getDay()))
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
        if (job.getUser() == null || !job.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("본인의 알바만 수정할 수 있습니다.");
        }
        job.setIsActive(false);
    }
}
