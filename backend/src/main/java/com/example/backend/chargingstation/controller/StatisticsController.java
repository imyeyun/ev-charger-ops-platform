package com.example.backend.chargingstation.controller;

import com.example.backend.chargingstation.dto.*;
import com.example.backend.chargingstation.service.StatisticsService;
import com.example.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Statistics", description = "충전소 통계 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    @Operation(summary = "충전소 검색", description = "충전소, 충전기, 충전기 상태 정보 조회")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<SearchRes>> search() {
        SearchRes response = statisticsService.search();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "상태 미확인 충전소 리스트", description = "비정상 상태(9,1,4,5)인 충전소 리스트 조회")
    @GetMapping("/uncheckList")
    public ResponseEntity<ApiResponse<UncheckListRes>> getUncheckList() {
        UncheckListRes response = statisticsService.getUncheckList();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "이상탐지 충전소 리스트", description = "조기 다운 이상탐지 충전소 리스트 조회")
    @GetMapping("/anomaly")
    public ResponseEntity<ApiResponse<AnomalyRes>> getAnomalyList() {
        AnomalyRes response = statisticsService.getAnomalyList();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "상태 미확인 충전기 현황", description = "상태별 충전기 개수 조회")
    @GetMapping("/uncheck")
    public ResponseEntity<ApiResponse<ChargerStatRes>> getUncheckStats() {
        ChargerStatRes response = statisticsService.getUncheckStats();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "지역별 상태 미확인 비율", description = "지역(zscode)별 비정상 상태 충전소 개수 조회")
    @GetMapping("/uncheckRg")
    public ResponseEntity<ApiResponse<UncheckRegionRes>> getUncheckByRegion() {
        UncheckRegionRes response = statisticsService.getUncheckByRegion();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "충전기 상태 현황", description = "전체 충전기 상태별 개수 조회")
    @GetMapping("/condition")
    public ResponseEntity<ApiResponse<ChargerStatRes>> getConditionStats() {
        ChargerStatRes response = statisticsService.getConditionStats();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "일별 상태 미확인 충전기 개수", description = "일별 비정상 상태 충전기 개수 추이")
    @GetMapping("/uncheckDaily")
    public ResponseEntity<ApiResponse<UncheckDailyRes>> getUncheckDaily() {
        UncheckDailyRes response = statisticsService.getUncheckDaily();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
