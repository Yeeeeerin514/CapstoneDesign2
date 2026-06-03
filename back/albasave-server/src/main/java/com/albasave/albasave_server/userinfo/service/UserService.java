package com.albasave.albasave_server.userinfo.service;

import com.albasave.albasave_server.auth.JwtProvider;
import com.albasave.albasave_server.business.domain.Business;
import com.albasave.albasave_server.business.repository.BusinessRepository;
import com.albasave.albasave_server.userinfo.domain.User;
import com.albasave.albasave_server.userinfo.dto.*;
import com.albasave.albasave_server.userinfo.repository.UserRepository;
import com.albasave.albasave_server.workinglog.domain.PartTimeJob;
import com.albasave.albasave_server.workinglog.repository.PartTimeJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    private final UserRepository         userRepository;
    private final PartTimeJobRepository  partTimeJobRepository;
    private final BusinessRepository     businessRepository;
    private final PasswordEncoder        passwordEncoder;
    private final JwtProvider jwtProvider;

    // ── 회원가입 ─────────────────────────────────────────────────────
    public void signUp(SignUpRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))  // BCrypt 해시
                .build();

        userRepository.save(user);
    }

    // ── 로그인 ───────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        String token = jwtProvider.generateToken(user.getId(), user.getEmail());
        return new LoginResponse(user.getId(), user.getName(), user.getEmail(), token);
    }

    // ── 알바 등록 ────────────────────────────────────────────────────
    public PartTimeJobRegisterResponse registerPartTimeJob(Long userId,
                                    PartTimeJobRegisterRequest req) throws IOException {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

        Business business = businessRepository
                .findFirstByManagementNumber(req.getBusinessRegistrationNum())
                .orElseThrow(() -> new IllegalArgumentException("사업장을 찾을 수 없습니다."));

        // 근무 요일 bitmask Integer 변환
        int daysBitmask = req.getDaysAsBitmask();

        PartTimeJob job = PartTimeJob.builder()
                .user(user)
                .business(business)
                .days(daysBitmask)
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .startDay(req.getStartDay())
                .hourlyWage(req.getHourlyWage())
                .isActive(true)
                .build();

        PartTimeJob saved = partTimeJobRepository.save(job);

        // 저장된 알바 ID 반환 (프론트에서 알바 삭제 요청 시 PathVariable로 활용)
        return new PartTimeJobRegisterResponse(saved.getId());
    }

    // ── 알바 그만두기 ─────────────────────────────────────────────────
    public void quitPartTimeJob(Long userId, Long partTimeJobId, PartTimeJobQuitRequest req) {
        // 권한 검증 + 조회를 한 번의 쿼리로 처리
        PartTimeJob job = partTimeJobRepository
                .findByIdAndUser_Id(partTimeJobId, userId)
                .orElseThrow(() -> new IllegalArgumentException("알바 정보를 찾을 수 없거나 접근 권한이 없습니다."));

        if (!job.getIsActive()) {
            throw new IllegalArgumentException("이미 종료된 알바입니다.");
        }

        job.quit(req.getEndDay());
    }

    // ── Private Helper ────────────────────────────────────────────────
    private String saveContractFile(Long userId, MultipartFile file) throws IOException {
        String dir = "uploads/contracts/" + userId;
        new File(dir).mkdirs();

        String ext = file.getOriginalFilename() != null &&
                file.getOriginalFilename().contains(".")
                ? file.getOriginalFilename().substring(
                file.getOriginalFilename().lastIndexOf("."))
                : "";
        String storedName = UUID.randomUUID() + ext;
        File dest = new File(dir, storedName);
        file.transferTo(dest);
        return dest.getPath();
    }
}
