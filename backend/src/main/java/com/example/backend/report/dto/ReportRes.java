package com.example.backend.report.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReportRes {

  @Schema(description = "30분 유효한 보고서 다운로드 URL", example = "https://bucket.s3.ap-northeast-2.amazonaws.com/pdf/test.pdf?...X-Amz-Expires=1800")
  @JsonProperty("s3_url")
  private String s3Url;

  public static ReportRes fromS3Url(String s3Url) {
    return ReportRes.builder()
      .s3Url(s3Url)
      .build();
  }
}
