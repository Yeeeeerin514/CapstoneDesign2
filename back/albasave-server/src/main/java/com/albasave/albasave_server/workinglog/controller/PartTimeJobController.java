package com.albasave.albasave_server.workinglog.controller;

import com.albasave.albasave_server.workinglog.dto.PartTimeJobRequest;
import com.albasave.albasave_server.workinglog.dto.PartTimeJobResponse;
import com.albasave.albasave_server.workinglog.service.PartTimeJobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/part-time-jobs")
@RequiredArgsConstructor
public class PartTimeJobController {

    private final PartTimeJobService partTimeJobService;

    @PostMapping
    public ResponseEntity<PartTimeJobResponse> create(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PartTimeJobRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(partTimeJobService.create(userId, req));
    }

    @GetMapping
    public ResponseEntity<List<PartTimeJobResponse>> getMyJobs(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(partTimeJobService.getMyJobs(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        partTimeJobService.deactivate(userId, id);
        return ResponseEntity.ok().build();
    }
}
