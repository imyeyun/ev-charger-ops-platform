package com.example.backend.report.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class ReportReq {

    @Schema(description = "보고서 유형", example = "charger_status")
    @NotBlank(message = "보고서 유형을 입력하지 않았습니다")
    private String reportType;

    @Schema(description = "보고서 생성 프롬프트", example = "최근 1개월간 장애 요약 보고서를 작성해줘.")
    private String prompt;

    @Schema(description = "데이터 시작 시간", example = "2024-01-01T00:00:00")
    @NotNull(message = "데이터 시작 시간을 입력하지 않았습니다")
    private LocalDateTime dataStartTime;

    @Schema(description = "데이터 종료 시간", example = "2024-01-31T23:59:59")
    @NotNull(message = "데이터 종료 시간을 입력하지 않았습니다")
    private LocalDateTime dataEndTime;
    @Schema(description = "충전기 상태 로그 파일 참조")
    @NotNull(message = "충전기 상태 파일 경로를 입력하지 않았습니다")
    private FileReference chargerStatus;

    @Schema(description = "멀티모달 분석 파일 참조")
    @NotNull(message = "멀티모달 분석 파일 경로를 입력하지 않았습니다")
    private MultimodalFileReference multimodalAnalysis;

    @Schema(description = "민원 미답변 파일 참조")
    @NotNull(message = "민원 미답변 파일 경로를 입력하지 않았습니다")
    private FileReference openRequests;

    @Schema(description = "민원 답변 파일 참조")
    @NotNull(message = "민원 답변 파일 경로를 입력하지 않았습니다")
    private FileReference requestOutbounds;

    @Schema(description = "충전기 상태 분석 파일 참조 (선택)")
    private FileReference chargerStatusAnalysis;

    @Getter
    @NoArgsConstructor
    public static class FileReference {
        @Schema(description = "파일 경로(S3 URL)", example = "https://s3.amazonaws.com/bucket/charger_status.csv")
        @NotBlank(message = "filePath를 입력하지 않았습니다")
        private String filePath;
    }

    @Getter
    @NoArgsConstructor
    public static class MultimodalFileReference {
        @Schema(description = "충전소 ID", example = "ST-1001")
        @NotBlank(message = "statId를 입력하지 않았습니다")
        private String statId;

        @Schema(description = "파일 경로(S3 URL)", example = "https://s3.amazonaws.com/bucket/multimodal.csv")
        @NotBlank(message = "filePath를 입력하지 않았습니다")
        private String filePath;
    }
}
