package com.example.backend.ai.dto.complaint;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class AiComplaintRes {

    private String answer;
    private LocalDateTime answerDt;
}
