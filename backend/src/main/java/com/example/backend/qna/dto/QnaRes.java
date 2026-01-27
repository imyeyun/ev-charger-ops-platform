package com.example.backend.qna.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QnaRes {

    @Schema(description = "AI 답변", example = "해당 공문서는 2024년 전기차 충전 인프라 지원 사업의 대상, 지원 금액, 신청 절차를 안내하고 있습니다.")
    private String answer;
}
