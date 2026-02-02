package com.example.backend.report.service;

import com.example.backend.ai.client.AiReportClient;
import com.example.backend.ai.dto.report.AiReportReq;
import com.example.backend.ai.dto.report.AiReportRes;
import com.example.backend.report.dto.ReportReq;
import com.example.backend.report.dto.ReportRes;
import com.example.backend.report.entity.Report;
import com.example.backend.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final ReportRepository reportRepository;
    private final AiReportClient aiReportClient;

    @Transactional
    public ReportRes createReport(ReportReq request) {
        AiReportReq aiRequest = AiReportReq.builder()
                .reportType(request.getReportType())
                .prompt(request.getPrompt())
                .dataStartTime(request.getDataStartTime())
                .dataEndTime(request.getDataEndTime())
                .chargerStatus(AiReportReq.FileReference.builder()
                        .filePath(request.getChargerStatus().getFilePath())
                        .build())
                .multimodalAnalysis(AiReportReq.MultimodalFileReference.builder()
                        .statId(request.getMultimodalAnalysis().getStatId())
                        .filePath(request.getMultimodalAnalysis().getFilePath())
                        .build())
                .openRequests(AiReportReq.FileReference.builder()
                        .filePath(request.getOpenRequests().getFilePath())
                        .build())
                .requestOutbounds(AiReportReq.FileReference.builder()
                        .filePath(request.getRequestOutbounds().getFilePath())
                        .build())
                .chargerStatusAnalysis(buildChargerStatusAnalysis(request))
                .build();

        AiReportRes aiResponse = aiReportClient.generateReport(aiRequest);

        Report report = Report.builder()
                .reportTitle(aiResponse.getReportTitle())
                .createdTime(LocalDateTime.now())
                .filePath(aiResponse.getFilePath())
                .reportType(request.getReportType())
                .prompt(request.getPrompt())
                .dataStartTime(request.getDataStartTime())
                .dataEndTime(request.getDataEndTime())
                .build();

        Report savedReport = reportRepository.save(report);

        return ReportRes.from(savedReport);
    }
    private AiReportReq.FileReference buildChargerStatusAnalysis(ReportReq request) {
        if (request.getChargerStatusAnalysis() == null) {
            return null;
        }
        return AiReportReq.FileReference.builder()
                .filePath(request.getChargerStatusAnalysis().getFilePath())
                .build();
    }
}
