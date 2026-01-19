package com.example.backend.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class ReportReq {

    @NotBlank(message = "보고서 유형을 입력하지 않았습니다")
    private String reportType;

    private String prompt;

    @NotNull(message = "데이터 시작 시간을 입력하지 않았습니다")
    private LocalDateTime dataStartTime;

    @NotNull(message = "데이터 종료 시간을 입력하지 않았습니다")
    private LocalDateTime dataEndTime;
}
