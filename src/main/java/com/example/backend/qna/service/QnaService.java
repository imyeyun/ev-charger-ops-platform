package com.example.backend.qna.service;

import com.example.backend.ai.client.AiQnaClient;
import com.example.backend.ai.dto.qna.AiQnaReq;
import com.example.backend.ai.dto.qna.AiQnaRes;
import com.example.backend.qna.dto.QnaReq;
import com.example.backend.qna.dto.QnaRes;
import com.example.backend.qna.entity.OfficialDocument;
import com.example.backend.qna.repository.OfficialDocumentRepository;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class QnaService {

    private final AiQnaClient aiQnaClient;
    private final OfficialDocumentRepository officialDocumentRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public QnaRes askQuestion(QnaReq request) {
        String prompt = buildPromptWithContext(request.getPrompt());

        AiQnaReq aiRequest = AiQnaReq.builder()
                //.prompt(request.getPrompt())
                .prompt(prompt)
                .build();

        AiQnaRes aiResponse = aiQnaClient.askQuestion(aiRequest);
        if (aiResponse == null || aiResponse.getAnswer() == null || aiResponse.getAnswer().isBlank()) {
            throw new IllegalStateException("AI 응답이 비어 있습니다.");
        }


        return QnaRes.builder()
                .answer(aiResponse.getAnswer())
                .build();
    }

    private String buildPromptWithContext(String prompt) {
        List<OfficialDocument> documents = officialDocumentRepository.findTop5ByOrderByPublishedDateDesc();
        if (documents.isEmpty()) {
            return prompt;
        }

        StringBuilder contextBuilder = new StringBuilder("다음 공문서 정보를 참고해서 질문에 답해주세요.\n");
        for (int i = 0; i < documents.size(); i++) {
            OfficialDocument doc = documents.get(i);
            contextBuilder.append(i + 1)
                    .append(". 제목: ").append(doc.getTitle())
                    .append(", 발행기관: ").append(doc.getIssuerName())
                    .append(", 발행일: ").append(doc.getPublishedDate().format(DATE_FORMATTER))
                    .append(", 파일경로: ").append(doc.getFilePath())
                    .append("\n");
        }
        contextBuilder.append("\n질문: ").append(prompt);
        return contextBuilder.toString();

    }
}
