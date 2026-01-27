package com.example.backend.ai.client;

import com.example.backend.ai.dto.complaint.AiComplaintReq;
import com.example.backend.ai.dto.complaint.AiComplaintRes;
import com.example.backend.global.exception.AiServerException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class AiComplaintClient {

    private final WebClient aiWebClient;

    public AiComplaintRes generateAnswer(AiComplaintReq request) {
        try {
            return aiWebClient.post()
                    .uri("/api/request_outbound")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiComplaintRes.class)
                    .block();
        } catch (Exception e) {
            throw new AiServerException("답변 생성 중 오류가 발생했습니다.", e);
        }
    }
}
