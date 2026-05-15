package com.albasave.albasave_server.contract.controller;

import com.albasave.albasave_server.contract.dto.ContractAnalysisResponse;
import com.albasave.albasave_server.contract.service.LaborContractAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
public class LaborContractController {

    private final LaborContractAnalysisService contractService;

    /**
     * 근로계약서 이미지 업로드 → 위법성 분석
     *
     * POST /api/contracts/analyze
     * Content-Type: multipart/form-data
     *   - image: 계약서 이미지 파일 (필수)
     *   - partTimeJobId: 연결할 알바 ID (선택)
     *
     * 응답:
     *   - extractedInfo: 계약서에서 추출한 시급, 근무시간 등
     *   - violations: 위반 항목 목록 (type, severity, description, legalBasis)
     *   - summary: 분석 요약
     *   - hasViolation: 위반 여부
     */
    @PostMapping("/analyze")
    public ResponseEntity<ContractAnalysisResponse> analyze(
            @AuthenticationPrincipal Long userId,
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "partTimeJobId", required = false) Long partTimeJobId) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contractService.analyzeContract(userId, image, partTimeJobId));
    }

    /**
     * 내 근로계약서 분석 이력 조회
     * GET /api/contracts
     */
    @GetMapping
    public ResponseEntity<List<ContractAnalysisResponse>> getHistory(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(contractService.getHistory(userId));
    }

    /**
     * 특정 근로계약서 분석 결과 조회
     * GET /api/contracts/{contractId}
     */
    @GetMapping("/{contractId}")
    public ResponseEntity<ContractAnalysisResponse> getOne(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long contractId) {
        return ResponseEntity.ok(contractService.getOne(userId, contractId));
    }
}
