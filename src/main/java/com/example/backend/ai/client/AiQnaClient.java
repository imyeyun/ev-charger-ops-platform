package com.example.backend.ai.client;

import com.example.backend.ai.dto.qna.AiQnaReq;
import com.example.backend.ai.dto.qna.AiQnaRes;
import com.example.backend.global.exception.AiServerException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class AiQnaClient {

    private final WebClient aiWebClient;

    public AiQnaRes askQuestion(AiQnaReq request) {
        try {
            return aiWebClient.post()
                    .uri("/api/QnA")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiQnaRes.class)
                    .block();
        } catch (Exception e) {
            throw new AiServerException("답변 생성 중 오류가 발생했습니다.", e);
        }
    }
}
