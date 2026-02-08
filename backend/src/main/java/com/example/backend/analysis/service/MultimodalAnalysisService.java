package com.example.backend.analysis.service;

import com.example.backend.ai.client.AiMultimodalClient;
import com.example.backend.ai.dto.multimodal.AiMultimodalReq;
import com.example.backend.ai.dto.multimodal.AiMultimodalRes;
import com.example.backend.analysis.dto.MultimodalAnalysisReq;
import com.example.backend.analysis.dto.MultimodalAnalysisRes;
import com.example.backend.analysis.entity.MultimodalAnalysis;
import com.example.backend.analysis.repository.MultimodalAnalysisRepository;
import com.example.backend.chargingstation.entity.ImageLog;
import com.example.backend.chargingstation.entity.SensorLog;
import com.example.backend.chargingstation.repository.ImageLogRepository;
import com.example.backend.chargingstation.repository.SensorLogRepository;
import com.example.backend.global.exception.NotFoundException;
import com.example.backend.global.storage.S3PresignedUrlService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MultimodalAnalysisService {


    private final MultimodalAnalysisRepository multimodalAnalysisRepository;
    private final ImageLogRepository imageLogRepository;
    private final SensorLogRepository sensorLogRepository;
    private final AiMultimodalClient aiMultimodalClient;
    private final S3PresignedUrlService presignedUrlService;

    @Transactional
    public MultimodalAnalysisRes analyze(MultimodalAnalysisReq request) {
        String statId = request.getStatId();
        String chgerId = request.getChgerId();

        ImageLog imageLog = imageLogRepository.findLatestByStatId(statId)
                .orElseThrow(() -> new NotFoundException("이미지 정보를 찾을 수 없습니다."));

        SensorLog sensorLog = sensorLogRepository.findTopByStatIdAndChgerIdOrderByTransactionIdDesc(statId, chgerId)
                .orElseThrow(() -> new NotFoundException("센서 정보를 찾을 수 없습니다."));

        AiMultimodalReq aiRequest = buildAiRequest(imageLog, sensorLog);
        AiMultimodalRes aiResponse = aiMultimodalClient.analyze(aiRequest);

        // 밑에 notes 부분 추가
        String notes = null;
        if (aiResponse.getVerdict() != null) {
            notes = aiResponse.getVerdict().getNotes();
        }

        /*MultimodalAnalysis analysis = MultimodalAnalysis.builder()
                .fireYn(aiResponse.getFireYN())
                .brokeYn(aiResponse.getBrokenYN())
                .dirtyYn(aiResponse.getDirtyYN()) // 변수명 수정
                .notes(notes) // 추가
                .imgsensoranalTime(LocalDateTime.now())
                .imgId(imageLog.getImgId())
                .imgTime(imageLog.getImgTime())
                .transactionId(sensorLog.getTransactionId())
                .chgerId2(chgerId)
                .statId2(statId)
                .build();

        multimodalAnalysisRepository.save(analysis);*/

        MultimodalAnalysis analysis = multimodalAnalysisRepository
                .findByChgerIdAndStatId(chgerId, statId)
                .orElseGet(() -> MultimodalAnalysis.builder()
                        .chgerId(chgerId)
                        .statId(statId)
                        .build()
                );


        analysis.updateResult(
                aiResponse.getFireYN(),
                aiResponse.getBrokenYN(),
                aiResponse.getDirtyYN(),
                notes,
                LocalDateTime.now(),
                imageLog.getImgId(),
                imageLog.getImgTime(),
                sensorLog.getTransactionId()
        );

        multimodalAnalysisRepository.save(analysis);

        return MultimodalAnalysisRes.builder()
                .fireYN(aiResponse.getFireYN())
                .brokenYN(aiResponse.getBrokenYN())
                .dirtyYN(aiResponse.getDirtyYN()) // 변수명 수정
                .notes(notes) // 추가
                .build();
    }

    private AiMultimodalReq buildAiRequest(ImageLog imageLog, SensorLog sensorLog) {
        // 이미지 URL 반환
        String ImageUrl = presignedUrlService.generateGetUrl(imageLog.getImgPath());
        AiMultimodalReq.ImageInfo imageInfo = AiMultimodalReq.ImageInfo.builder()
                .imgPath(ImageUrl)
                .build();

        AiMultimodalReq.SensorLogInfo sensorInfo = AiMultimodalReq.SensorLogInfo.builder()
                .transactionId(sensorLog.getTransactionId())
                .chgerId(sensorLog.getChgerId())
                .statId(sensorLog.getStatId())
                .totalChargingKwh(sensorLog.getTotalChargingKwh())
                .totalChargingMin(sensorLog.getTotalChargingMin())
                .currentSoc(sensorLog.getCurrentSoc())
                .currentEnergyMeterValue(sensorLog.getCurrentEnergyMeterValue())
                .chargingv(sensorLog.getChargingv())
                .charginga(sensorLog.getCharginga())
                .outPower(sensorLog.getOutPower())
                .chargingGunTemperature1(sensorLog.getChargingGunTemperature1())
                .chargingGunTemperature2(sensorLog.getChargingGunTemperature2())
                .detailLabel(sensorLog.getDetailLabel())
                .build();

        return AiMultimodalReq.builder()
                .image(imageInfo)
                .sensorLog(sensorInfo)
                .build();
    }
}