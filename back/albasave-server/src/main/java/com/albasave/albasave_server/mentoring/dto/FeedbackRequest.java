package com.albasave.albasave_server.mentoring.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class FeedbackRequest {
    private Long matchId;
    private int rating;        // 1~5
    private int chatDays;
    private boolean resolved;
    private String comment;
}
