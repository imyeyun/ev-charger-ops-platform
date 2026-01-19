package com.example.backend.ai.mapper;

import com.example.backend.ai.dto.multimodal.AiMultimodalReq;
import com.example.backend.chargingstation.entity.ImageLog;
import com.example.backend.chargingstation.entity.SensorLog;
import org.springframework.stereotype.Component;

@Component
public class MultimodalAiMapper {

    public AiMultimodalReq.ImageInfo toImageInfo(ImageLog imageLog) {
        if (imageLog == null) {
            return null;
        }
        return AiMultimodalReq.ImageInfo.builder()
                .imgPath(imageLog.getImgPath())
                .build();
    }

    public AiMultimodalReq.SensorLogInfo toSensorLogInfo(SensorLog sensorLog) {
        if (sensorLog == null) {
            return null;
        }
        return AiMultimodalReq.SensorLogInfo.builder()
                .sensorTime(sensorLog.getSensorTime())
                .totalChargingKwh(sensorLog.getTotalChargingKwh())
                .totalChargingMin(sensorLog.getTotalChargingMin())
                .currentSoc(sensorLog.getCurrentSoc())
                .currentEnergyMeterValue(sensorLog.getCurrentEnergyMeterValue())
                .chargingv(sensorLog.getChargingv())
                .charginga(sensorLog.getCharginga())
                .outPower(sensorLog.getOutPower())
                .chargingGunTemperature1(sensorLog.getChargingGunTemperature1())
                .chargingGunTemperature2(sensorLog.getChargingGunTemperature2())
                .types(sensorLog.getTypes())
                .build();
    }
}