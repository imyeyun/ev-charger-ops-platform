package com.example.backend.ai.client;

import com.example.backend.ai.dto.multimodal.AiMultimodalReq;
import com.example.backend.ai.dto.multimodal.AiMultimodalRes;
import com.example.backend.global.exception.AiServerException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class AiMultimodalClient {

    private final WebClient aiWebClient;

    public AiMultimodalRes analyze(AiMultimodalReq request) {
        try {
            return aiWebClient.post()
                    .uri("/api/multimodal_analysis")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiMultimodalRes.class)
                    .block();
        } catch (Exception e) {
            throw new AiServerException("멀티모달 분석 중 오류가 발생했습니다.", e);
        }
    }
}
