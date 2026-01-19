package com.example.backend.qna.controller;

import com.example.backend.qna.dto.QnaReq;
import com.example.backend.qna.dto.QnaRes;
import com.example.backend.qna.service.QnaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "QnA", description = "Q&A API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class QnaController {

    private final QnaService qnaService;

    @Operation(summary = "Q&A 질문", description = "AI 서버에 질문하고 답변 받기")
    @PostMapping("/QnA")
    public ResponseEntity<QnaRes> askQuestion(@RequestBody QnaReq request) {
        QnaRes response = qnaService.askQuestion(request);
        return ResponseEntity.ok(response);
    }
}
