package com.example.backend.report.dto;

import com.example.backend.report.entity.Report;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReportRes {

    private Long reportId;
    private String reportTitle;
    private LocalDateTime createdTime;
    private String filePath;
    private String reportType;
    private String prompt;
    private LocalDateTime dataStartTime;
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
