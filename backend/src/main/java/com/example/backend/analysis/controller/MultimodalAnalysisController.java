package com.example.backend.analysis.controller;

import com.example.backend.analysis.dto.MultimodalAnalysisReq;
import com.example.backend.analysis.dto.MultimodalAnalysisRes;
import com.example.backend.analysis.service.MultimodalAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "MultimodalAnalysis", description = "멀티모달 분석 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MultimodalAnalysisController {

    private final MultimodalAnalysisService multimodalAnalysisService;

    @Operation(summary = "충전소/충전기 멀티모달 분석", description = "이미지와 센서 데이터 기반 AI 분석")
    @PostMapping("/multimodal_analysis")
    public ResponseEntity<MultimodalAnalysisRes> analyze(@RequestBody MultimodalAnalysisReq request) {
        MultimodalAnalysisRes response = multimodalAnalysisService.analyze(request);
        return ResponseEntity.ok(response);
    }
}
