package com.example.backend.chargingstation.controller;

import com.example.backend.chargingstation.dto.StationDetailReq;
import com.example.backend.chargingstation.dto.StationDetailRes;
import com.example.backend.chargingstation.service.ChargingStationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "ChargingStation", description = "충전소 API")
@RestController
@RequestMapping("/api/charging_station")
@RequiredArgsConstructor
public class ChargingStationController {

    private final ChargingStationService chargingStationService;

    @Operation(summary = "충전소 상세 조회", description = "충전소 ID로 상세 정보 조회")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(
        examples = @ExampleObject(value = """
                {
                    "statId": "ST000001"
                }
                """)))
    @PostMapping("/detail")
    public ResponseEntity<StationDetailRes> getStationDetail(@RequestBody StationDetailReq request) {
        StationDetailRes response = chargingStationService.getStationDetail(request);
        return ResponseEntity.ok(response);
    }
}
