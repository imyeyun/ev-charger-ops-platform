package com.example.backend.report.dto;

import com.example.backend.report.entity.Report;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReportRes {


  @Schema(description = "보고서 ID", example = "100")
  private Long reportId;
  @Schema(description = "보고서 제목", example = "2024년 1월 충전기 상태 요약")
  private String reportTitle;
  @Schema(description = "생성 일시", example = "2024-02-01T10:15:30")
  private LocalDateTime createdTime;
  @Schema(description = "보고서 파일 경로", example = "https://s3.amazonaws.com/bucket/report-100.pdf")
  private String filePath;
  @Schema(description = "보고서 유형", example = "charger_status")
  private String reportType;
  @Schema(description = "사용자 프롬프트", example = "최근 1개월간 장애 요약 보고서를 작성해줘.")
  private String prompt;
  @Schema(description = "데이터 시작 시간", example = "2024-01-01T00:00:00")
  private LocalDateTime dataStartTime;
  @Schema(description = "데이터 종료 시간", example = "2024-01-31T23:59:59")
  private LocalDateTime dataEndTime;

  public static ReportRes from(Report report) {
    return ReportRes.builder()
      .reportId(report.getReportId())
      .reportTitle(report.getReportTitle())
      .createdTime(report.getCreatedTime())
      .filePath(report.getFilePath())
      .reportType(report.getReportType())
      .prompt(report.getPrompt())
      .dataStartTime(report.getDataStartTime())
      .dataEndTime(report.getDataEndTime())
      .build();
  }
}
