package com.example.backend.report.service;

import com.example.backend.ai.client.AiReportClient;
import com.example.backend.ai.dto.report.AiReportReq;
import com.example.backend.ai.dto.report.AiReportRes;
import com.example.backend.report.dto.ReportReq;
import com.example.backend.report.dto.ReportRes;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final AiReportClient aiReportClient;

    public ReportRes createReport(ReportReq request) {
        AiReportReq aiRequest = AiReportReq.builder()
                .inputPrompt(request.getInputPrompt())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .reportType(request.getReportType())
                .build();

        AiReportRes aiResponse = aiReportClient.generateReport(aiRequest);
        return ReportRes.fromS3Path(aiResponse.getS3Path());
    }
}
