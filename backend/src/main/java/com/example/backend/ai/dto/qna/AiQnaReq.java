package com.example.backend.ai.dto.qna;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AiQnaReq {

    private String prompt;
    private String threadId; // ⭐스레드 id 추가
}
