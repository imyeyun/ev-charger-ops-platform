package com.example.backend.report.service;

import com.example.backend.ai.client.AiReportClient;
import com.example.backend.ai.dto.report.AiReportReq;
import com.example.backend.ai.dto.report.AiReportRes;
import com.example.backend.global.exception.AiServerException;
import com.example.backend.global.storage.S3PresignedUrlService;
import com.example.backend.report.dto.ReportReq;
import com.example.backend.report.dto.ReportRes;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final AiReportClient aiReportClient;
    private final S3PresignedUrlService presignedUrlService;

    public ReportRes createReport(ReportReq request) {
        log.info("[Report] createReport called reportType={}, startTime={}, endTime={}",
                request.getReportType(), request.getStartTime(), request.getEndTime());

        AiReportReq aiRequest = AiReportReq.builder()
                .inputPrompt(request.getInputPrompt())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .reportType(request.getReportType())
                .build();

        AiReportRes aiResponse = aiReportClient.generateReport(aiRequest);
        log.info("[Report] AI response received s3_path={}", aiResponse != null ? aiResponse.getS3Path() : null);

        if (aiResponse == null || aiResponse.getS3Path() == null || aiResponse.getS3Path().isBlank()) {
            log.error("[Report] Invalid AI response. s3_path is null or blank");
            throw new AiServerException("AI 서버 응답에 s3_path가 없습니다.");
        }

        String s3Path = aiResponse.getS3Path().trim();
        String presignedUrl;
        try {
            presignedUrl = presignedUrlService.generateGetUrl(s3Path);
        } catch (Exception e) {
            log.error("[Report] Failed to generate presigned URL for key={}", s3Path, e);
            throw new AiServerException("S3 URL 생성 실패: " + e.getMessage(), e);
        }

        log.info("[Report] Presigned URL generated successfully for key={}", s3Path);
        return ReportRes.fromS3Url(presignedUrl);
    }
}
