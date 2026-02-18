package com.example.backend.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class ReportReq {

    @Schema(description = "보고서 생성 프롬프트", example = "기본적인 전기차 충전소 보고서를 작성해줘")
    @JsonProperty("input_prompt")
    @NotBlank(message = "input_prompt를 입력하지 않았습니다")
    private String inputPrompt;

    @Schema(description = "데이터 시작 시간", example = "2026-01-15 00:00:00")
    @JsonProperty("start_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @NotNull(message = "start_time을 입력하지 않았습니다")
    private LocalDateTime startTime;

    @Schema(description = "데이터 종료 시간", example = "2026-01-17 23:59:59")
    @JsonProperty("end_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @NotNull(message = "end_time을 입력하지 않았습니다")
    private LocalDateTime endTime;

    @Schema(description = "보고서 유형", example = "test")
    @JsonProperty("report_type")
    @NotBlank(message = "report_type을 입력하지 않았습니다")
    private String reportType;
}
