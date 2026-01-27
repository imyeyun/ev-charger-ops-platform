package com.example.backend.ai.client;

import com.example.backend.ai.dto.report.AiReportReq;
import com.example.backend.ai.dto.report.AiReportRes;
import com.example.backend.global.exception.AiServerException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class AiReportClient {

    private final WebClient aiWebClient;

    public AiReportRes generateReport(AiReportReq request) {
        try {
            return aiWebClient.post()
                    .uri("/api/report")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiReportRes.class)
                    .block();
        } catch (Exception e) {
            throw new AiServerException("보고서 생성 중 오류가 발생했습니다.", e);
        }
    }
}
