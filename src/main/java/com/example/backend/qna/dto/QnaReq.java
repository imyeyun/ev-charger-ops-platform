package com.example.backend.qna.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class QnaReq {

    @Schema(description = "질문 내용", example = "2024년 전기차 충전 인프라 지원 정책의 주요 내용은 무엇인가요?")
    @NotBlank(message = "질문은 필수 입력값입니다.")
    private String prompt;
}
