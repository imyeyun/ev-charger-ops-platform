package com.example.backend.ai.dto.multimodal;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AiMultimodalReq {

    private ImageInfo image;
    private SensorLogInfo sensorLog;

    @Getter
    @Builder
    public static class ImageInfo {
        private String imgPath;
    }

    @Getter
    @Builder
    public static class SensorLogInfo {
        private LocalDateTime sensorTime;
        private Double totalChargingKwh;
        private Integer totalChargingMin;
        private Integer currentSoc;
        private Double currentEnergyMeterValue;
        private Double chargingv;
        private Double charginga;
        private Double outPower;
        private Integer chargingGunTemperature1;
        private Integer chargingGunTemperature2;
        private Integer types;
        private String chgerId;
        private String statId;
    }
}