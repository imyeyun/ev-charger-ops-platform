package com.example.backend.qna.service;

import com.example.backend.ai.client.AiQnaClient;
import com.example.backend.ai.dto.qna.AiQnaReq;
import com.example.backend.ai.dto.qna.AiQnaRes;
import com.example.backend.qna.dto.QnaReq;
import com.example.backend.qna.dto.QnaRes;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class QnaService {

    private final AiQnaClient aiQnaClient;

    public QnaRes askQuestion(QnaReq request) {
        AiQnaReq aiRequest = AiQnaReq.builder()
                .prompt(request.getPrompt())
                .build();

        AiQnaRes aiResponse = aiQnaClient.askQuestion(aiRequest);

        return QnaRes.builder()
                .answer(aiResponse.getAnswer())
                .build();
    }
}
