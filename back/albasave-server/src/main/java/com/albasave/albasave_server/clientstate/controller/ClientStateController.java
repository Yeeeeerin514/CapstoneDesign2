package com.albasave.albasave_server.clientstate.controller;

import com.albasave.albasave_server.clientstate.domain.UserClientState;
import com.albasave.albasave_server.clientstate.repository.UserClientStateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 사용자별 클라이언트 상태 동기화 — 기기간에 신고 사건·멘토 매칭 등 클라이언트 상태를 잇는다.
 *
 *   GET /api/client-state/{key}  → { payload: <json|null> }   (로그인 유저 본인 것만)
 *   PUT /api/client-state/{key}  body { payload: <json> }      → upsert
 *
 * 인증 필요(/api/** authenticated). userId는 JWT에서 주입되어 사용자 격리됨.
 */
@RestController
@RequestMapping("/api/client-state")
@RequiredArgsConstructor
public class ClientStateController {

    private final UserClientStateRepository repository;

    @GetMapping("/{key}")
    public ResponseEntity<Map<String, String>> get(
            @AuthenticationPrincipal Long userId,
            @PathVariable("key") String key) {
        String payload = repository.findByUserIdAndStoreKey(userId, key)
                .map(UserClientState::getPayload)
                .orElse(null);
        Map<String, String> body = new HashMap<>();
        body.put("payload", payload); // 없으면 null
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{key}")
    @Transactional
    public ResponseEntity<Void> put(
            @AuthenticationPrincipal Long userId,
            @PathVariable("key") String key,
            @RequestBody Map<String, String> body) {
        String payload = body.getOrDefault("payload", "");
        UserClientState state = repository.findByUserIdAndStoreKey(userId, key)
                .orElseGet(UserClientState::new);
        state.setUserId(userId);
        state.setStoreKey(key);
        state.setPayload(payload);
        state.setUpdatedAt(LocalDateTime.now());
        repository.save(state);
        return ResponseEntity.ok().build();
    }
}
