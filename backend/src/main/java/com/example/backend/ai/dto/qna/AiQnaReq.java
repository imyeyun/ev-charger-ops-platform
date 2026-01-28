package com.example.backend.ai.dto.qna;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AiQnaReq {

    private String prompt;
    private String sessionId; // ⭐세션 id 추가
}
