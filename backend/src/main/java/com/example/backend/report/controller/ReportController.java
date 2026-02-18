package com.example.backend.report.controller;

import com.example.backend.report.dto.ReportReq;
import com.example.backend.report.dto.ReportRes;
import com.example.backend.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Report", description = "보고서 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @Operation(summary = "보고서 생성", description = "AI 기반 보고서 생성")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(
            examples = @ExampleObject(value = """
                    {
                      "input_prompt": "기본적인 전기차 충전소 보고서를 작성해줘",
                      "start_time": "2026-01-15 00:00:00",
                      "end_time": "2026-01-17 23:59:59",
                      "report_type": "test"
                    }
                    """)))
    @PostMapping("/report")
    public ResponseEntity<ReportRes> createReport(@Valid @RequestBody ReportReq request) {
        ReportRes response = reportService.createReport(request);
        return ResponseEntity.ok(response);
    }
}
