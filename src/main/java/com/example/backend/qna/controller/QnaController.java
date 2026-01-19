package com.example.backend.qna.controller;

import com.example.backend.qna.dto.QnaReq;
import com.example.backend.qna.dto.QnaRes;
import com.example.backend.qna.service.QnaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "QnA", description = "Q&A API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class QnaController {

    private final QnaService qnaService;

    //@Operation(summary = "Q&A 질문", description = "AI 서버에 질문하고 답변 받기")
    @Operation(summary = "Q&A 질문", description = "공문서 정보를 기반으로 AI 서버에 질문하고 답변 받기")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "응답 성공",
                    content = @Content(schema = @Schema(implementation = QnaRes.class))),
            @ApiResponse(responseCode = "400", description = "요청 오류"),
            @ApiResponse(responseCode = "500", description = "AI 응답 오류")
    })
    @PostMapping("/QnA")
    //public ResponseEntity<QnaRes> askQuestion(@RequestBody QnaReq request) {
    public ResponseEntity<QnaRes> askQuestion(
            @RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = QnaReq.class))
            )
            @Valid @org.springframework.web.bind.annotation.RequestBody QnaReq request
    ) {
        QnaRes response = qnaService.askQuestion(request);
        return ResponseEntity.ok(response);
    }
}
