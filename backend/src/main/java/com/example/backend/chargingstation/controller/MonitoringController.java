package com.example.backend.chargingstation.controller;

import com.example.backend.chargingstation.dto.MonitoringRes;
import com.example.backend.chargingstation.service.MonitoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Monitoring", description = "모니터링 API")
@RestController
@RequestMapping("/api/monitoring")
@RequiredArgsConstructor
public class MonitoringController {

    private final MonitoringService monitoringService;

    @Operation(summary = "충전소 모니터링 조회", description = "전체 충전소 현황 및 상태 통계 조회")
    @GetMapping
    public ResponseEntity<MonitoringRes> getMonitoringData() {
        MonitoringRes response = monitoringService.getMonitoringData();
        return ResponseEntity.ok(response);
    }
}
