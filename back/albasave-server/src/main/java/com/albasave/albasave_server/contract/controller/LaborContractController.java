package com.albasave.albasave_server.contract.controller;

import com.albasave.albasave_server.contract.dto.ContractAnalysisResponse;
import com.albasave.albasave_server.contract.dto.ContractFactSheet;
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
     * 특정 알바(관심업장)의 가장 최근 계약서 분석 조회.
     * GET /api/contracts/latest?partTimeJobId=N
     * 프론트 로컬 캐시(contractAnalysis) 유실 시 "분석 결과 다시 보기"의 서버 폴백 — 없으면 404.
     */
    @GetMapping("/latest")
    public ResponseEntity<ContractAnalysisResponse> getLatestForPartTimeJob(
            @AuthenticationPrincipal Long userId,
            @RequestParam("partTimeJobId") Long partTimeJobId) {
        return contractService.getLatestForPartTimeJob(userId, partTimeJobId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
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

    /**
     * 진정서 작성용 정형 데이터만 가볍게 조회.
     * GET /api/contracts/{contractId}/factsheet
     *
     * <p>진정서 작성 화면에서 분석 결과 전체가 아닌 정형 필드만 필요할 때 사용.
     * 응답이 ContractAnalysisResponse 대비 약 1/5 크기.
     *
     * <h3>응답 필드</h3>
     * <ul>
     *   <li>businessRegistrationNumber: String (10자리)</li>
     *   <li>workDays: List&lt;DayOfWeek&gt;</li>
     *   <li>workStartTime / workEndTime: LocalTime (HH:mm)</li>
     *   <li>employmentStartDate / employmentEndDate: LocalDate (yyyy-MM-dd)</li>
     *   <li>hourlyWage / monthlyWage: Integer</li>
     *   <li>wagePaymentDate: String (예: "매월 5일")</li>
     *   <li>breakStartTime / breakEndTime: LocalTime</li>
     *   <li>employerName / employerAddress / employerPhone / employerRepresentative: String</li>
     * </ul>
     */
    @GetMapping("/{contractId}/factsheet")
    public ResponseEntity<ContractFactSheet> getFactSheet(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long contractId) {
        return ResponseEntity.ok(contractService.getOne(userId, contractId).getFactSheet());
    }
}
