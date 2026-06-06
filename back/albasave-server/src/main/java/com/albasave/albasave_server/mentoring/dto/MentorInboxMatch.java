package com.albasave.albasave_server.mentoring.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 멘토 인박스 항목 — 로그인한 멘토가 "본인이 멘토로 매칭된" 상담들을 목록으로 본다.
 * 멘티 실명은 비공개(익명 1:1 원칙)라 menteeLabel만 노출하고, 대신 상담 맥락
 * (업종·피해유형·요청 설명)과 마지막 메시지로 어떤 상담인지 구분한다.
 */
@Getter
@Builder
public class MentorInboxMatch {

    private Long matchId;

    /** ACTIVE | COMPLETED — 멘티가 확정(결제·동의)한 매칭만 인박스에 노출. */
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime matchedAt;

    /** 매칭 점수(0~1) — 발표/참고용. */
    private double matchScore;

    /** 멘티 익명 라벨 (실명 비공개). */
    private String menteeLabel;

    // ── 상담 맥락 (멘티 요청서에서) ──────────────────────────────
    private String industry;          // 업종 라벨 (nullable)
    private List<String> damageTypes; // 피해유형 라벨들
    private String descriptionSnippet; // 멘티 요청 설명 일부 (nullable)

    // ── 마지막 메시지 미리보기 ───────────────────────────────────
    private String lastMessageText;     // nullable (아직 대화 없음)
    private LocalDateTime lastMessageAt; // nullable
    private int messageCount;
}
