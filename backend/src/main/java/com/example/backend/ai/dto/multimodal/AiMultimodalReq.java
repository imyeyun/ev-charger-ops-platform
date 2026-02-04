package com.example.backend.ai.dto.multimodal;

import lombok.Builder;
import lombok.Getter;

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
        private String transactionId;
        private Double totalChargingKwh;
        private Integer totalChargingMin;
        private Integer currentSoc;
        private Double currentEnergyMeterValue;
        private Double chargingv;
        private Double charginga;
        private Double outPower;
        private Integer chargingGunTemperature1;
        private Integer chargingGunTemperature2;
        private Integer detailLabel;
        private String chgerId;
        private String statId;
    }
}