package com.example.backend.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "report")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long reportId;

    @Column(name = "report_title", nullable = false, length = 255)
    private String reportTitle;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime;

    @Column(name = "file_path", nullable = false, length = 255)
    private String filePath;

    @Column(name = "report_type", nullable = false, length = 20)
    private String reportType;

    @Column(name = "prompt", columnDefinition = "TEXT")
    private String prompt;

    @Column(name = "data_start_time", nullable = false)
    private LocalDateTime dataStartTime;

    @Column(name = "data_end_time", nullable = false)
    private LocalDateTime dataEndTime;

    @Builder
    public Report(String reportTitle, LocalDateTime createdTime, String filePath,
                  String reportType, String prompt, LocalDateTime dataStartTime,
                  LocalDateTime dataEndTime) {
        this.reportTitle = reportTitle;
        this.createdTime = createdTime;
        this.filePath = filePath;
        this.reportType = reportType;
        this.prompt = prompt;
        this.dataStartTime = dataStartTime;
        this.dataEndTime = dataEndTime;
    }
}
