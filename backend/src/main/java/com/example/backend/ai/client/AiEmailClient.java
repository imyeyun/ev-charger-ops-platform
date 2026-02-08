package com.example.backend.ai.client;

import com.example.backend.ai.dto.email.AlertEmailReq;
import com.example.backend.ai.dto.email.AlertEmailRes;
import com.example.backend.global.exception.AiServerException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class AiEmailClient {

    private final WebClient aiWebClient;

    public AlertEmailRes sendEmail(AlertEmailReq request) {
        try {
            return aiWebClient.post()
                    .uri("/api/notification")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AlertEmailRes.class)
                    .block();
        } catch (Exception e) {
            throw new AiServerException("이메일 발송 중 오류가 발생했습니다.", e);
        }
    }
}
