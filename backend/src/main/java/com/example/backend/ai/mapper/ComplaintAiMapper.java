package com.example.backend.ai.mapper;

import com.example.backend.ai.dto.complaint.AiComplaintReq;
import com.example.backend.analysis.entity.MultimodalAnalysis;
import com.example.backend.chargingstation.entity.Charger;
import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.entity.ChargingStation;
import com.example.backend.request.entity.Request;
import org.springframework.stereotype.Component;

@Component
public class ComplaintAiMapper {

    public AiComplaintReq.ChargerStatusInfo toChargerStatusInfo(
            ChargingStation station,
            Charger charger,
            ChargerLog log,
            String zcodeDesc,
            String zscodeDesc,
            String busidDesc) {

        return AiComplaintReq.ChargerStatusInfo.builder()
                .statId(station.getStatId())
                .zcodeDescription(zcodeDesc)
                .zscodeDescription(zscodeDesc)
                .busidDescription(busidDesc)
                .statNm(station.getStatNm())
                .addr(station.getAddr())
                .busiCall(station.getBusiCall())
                .year(station.getYear())
                .chgerId(charger.getChgerId())
                .chgerType(charger.getChgerType())
                .output(charger.getOutput())
                .method(charger.getMethod())
                .chgerTime(log != null ? log.getChgerTime() : null)
                .lastTsdt(log != null ? log.getLastTsdt() : null)
                .lastTedt(log != null ? log.getLastTedt() : null)
                .statUpdDt(log != null ? log.getStatUpdDt() : null)
                .stat(log != null ? log.getStat() : null)
                .build();
    }

    public AiComplaintReq.MultimodalAnalysisInfo toMultimodalAnalysisInfo(
            ChargingStation station,
            MultimodalAnalysis analysis,
            String zcodeDesc,
            String zscodeDesc,
            String busidDesc) {

        return AiComplaintReq.MultimodalAnalysisInfo.builder()
                .statId(station.getStatId())
                .zcodeDescription(zcodeDesc)
                .zscodeDescription(zscodeDesc)
                .busidDescription(busidDesc)
                .statNm(station.getStatNm())
                .addr(station.getAddr())
                .busiCall(station.getBusiCall())
                .year(station.getYear())
                .multimodalId(analysis.getMultimodalId())
                .fireYn(analysis.getFireYn())
                .fireDetails(analysis.getFireDetails())
                .brokeYn(analysis.getBrokeYn())
                .brokeDetails(analysis.getBrokeDetails())
                .cleanYn(analysis.getCleanYn())
                .cleanDetails(analysis.getCleanDetails())
                .imgsensoranalTime(analysis.getImgsensoranalTime())
                .build();
    }

    public AiComplaintReq.RequestInfo toRequestInfo(Request request) {
        return AiComplaintReq.RequestInfo.builder()
                .reqId(request.getReqId())
                .title(request.getTitle())
                .content(request.getContent())
                .reqType(request.getReqType().name())
                .build();
    }
}
