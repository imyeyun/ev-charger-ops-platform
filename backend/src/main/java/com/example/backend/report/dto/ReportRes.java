package com.example.backend.report.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReportRes {

  @Schema(description = "보고서 S3 경로", example = "pdf/test.pdf")
  @JsonProperty("s3_url")
  private String s3Url;

  public static ReportRes fromS3Path(String s3Path) {
    return ReportRes.builder()
      .s3Url(s3Path)
      .build();
  }
}
