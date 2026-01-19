package com.example.backend.report.controller;

import com.example.backend.global.response.ApiResponse;
import com.example.backend.report.dto.ReportReq;
import com.example.backend.report.dto.ReportRes;
import com.example.backend.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Report", description = "보고서 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @Operation(summary = "보고서 생성", description = "AI 기반 보고서 생성")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "보고서 생성 성공",
                    content = @Content(schema = @Schema(implementation = ReportRes.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "요청 오류"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "AI 응답 오류")
    })
    @PostMapping("/report")
    //public ResponseEntity<ApiResponse<ReportRes>> createReport(@Valid @RequestBody ReportReq request) {
    public ResponseEntity<ApiResponse<ReportRes>> createReport(
            @RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ReportReq.class))
            )
            @Valid @org.springframework.web.bind.annotation.RequestBody ReportReq request
    ) {
        ReportRes response = reportService.createReport(request);
        return ResponseEntity.ok(ApiResponse.success("보고서가 생성되었습니다.", response));
    }
}
