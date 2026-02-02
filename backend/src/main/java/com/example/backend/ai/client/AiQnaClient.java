package com.example.backend.ai.client;

import com.example.backend.ai.dto.qna.AiQnaReq;
import com.example.backend.ai.dto.qna.AiQnaRes;
import com.example.backend.global.exception.AiServerException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class AiQnaClient {

    private final WebClient aiWebClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiQnaRes askQuestion(AiQnaReq request) {
        try {
            return aiWebClient.post()
                    .uri("/api/QnA")
                    .bodyValue(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .map(this::extractErrorMessage)
                            .map(message -> new AiServerException(message)))
                    .bodyToMono(AiQnaRes.class)
                    .block();
        } catch (Exception e) {
            if (e instanceof AiServerException aiServerException) {
                throw aiServerException;
            }
            throw new AiServerException("답변 생성 중 오류가 발생했습니다.", e);
        }

    }
    private String extractErrorMessage(String errorBody) {
        if (errorBody == null || errorBody.isBlank()) {
            return "답변 생성 중 오류가 발생했습니다.";
        }
        try {
            JsonNode root = objectMapper.readTree(errorBody);
            JsonNode messageNode = root.get("message");
            if (messageNode != null && !messageNode.asText().isBlank()) {
                return messageNode.asText();
            }
        } catch (IOException ignored) {
            // ignore parsing issues and fallback to default message
        }
        return "답변 생성 중 오류가 발생했습니다.";
    }
}

