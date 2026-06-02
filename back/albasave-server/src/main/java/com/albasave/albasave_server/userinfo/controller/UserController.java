package com.albasave.albasave_server.userinfo.controller;

import com.albasave.albasave_server.userinfo.dto.*;
import com.albasave.albasave_server.userinfo.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    /** 회원가입 */
    @PostMapping("/signup")
    public ResponseEntity<Void> signUp(@RequestBody SignUpRequest req) {
        userService.signUp(req);
        return ResponseEntity.ok().build();
    }

    /** 로그인 → JWT 반환 */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(userService.login(req));
    }

    /** 알바 등록 */
    @PostMapping(value = "/part-time-job/register")
    public ResponseEntity<PartTimeJobRegisterResponse> registerPartTimeJob(
            @RequestParam Long userId,
            @RequestPart("data") PartTimeJobRegisterRequest req
            //@RequestPart(value = "contractFile", required = false) MultipartFile contractFile
    ) throws Exception {
        PartTimeJobRegisterResponse response = userService.registerPartTimeJob(userId, req);
        return ResponseEntity.status(201).body(response);
    }

    /** 알바 그만두기 */
    @PatchMapping("/part-time-job/{partTimeJobId}/quit")
    public ResponseEntity<Void> quitPartTimeJob(
            @RequestParam Long userId,
            @PathVariable Long partTimeJobId,
            @RequestBody PartTimeJobQuitRequest req) {
        userService.quitPartTimeJob(userId, partTimeJobId, req);
        return ResponseEntity.ok().build();
    }
}
