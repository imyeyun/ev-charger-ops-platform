package com.example.backend.ai.mapper;

import com.example.backend.ai.dto.report.AiReportReq;
import com.example.backend.analysis.entity.MultimodalAnalysis;
import com.example.backend.chargingstation.entity.Charger;
import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.entity.ChargingStation;
import com.example.backend.request.entity.Request;
import com.example.backend.requestoutbound.entity.RequestOutbound;
import org.springframework.stereotype.Component;

@Component
public class ReportAiMapper {

    public AiReportReq.ChargerStatusInfo toChargerStatusInfo(
            ChargingStation station,
            Charger charger,
            ChargerLog log,
            String zcodeDesc,
            String zscodeDesc,
            String busidDesc) {

        return AiReportReq.ChargerStatusInfo.builder()
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

    public AiReportReq.MultimodalAnalysisInfo toMultimodalAnalysisInfo(
            ChargingStation station,
            Charger charger,
            MultimodalAnalysis analysis,
            String zcodeDesc,
            String zscodeDesc,
            String busidDesc) {

        return AiReportReq.MultimodalAnalysisInfo.builder()
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

    public AiReportReq.OpenRequestInfo toOpenRequestInfo(
            ChargingStation station,
            Charger charger,
            Request request,
            String zcodeDesc,
            String zscodeDesc,
            String busidDesc) {

        return AiReportReq.OpenRequestInfo.builder()
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
                .reqId(request.getReqId())
                .title(request.getTitle())
                .content(request.getContent())
                .reqType(request.getReqType().name())
                .reqDt(request.getReqDt())
                .status(request.getStatus().name())
                .build();
    }

    public AiReportReq.RequestOutboundInfo toRequestOutboundInfo(
            ChargingStation station,
            Charger charger,
            Request request,
            RequestOutbound outbound,
            String zcodeDesc,
            String zscodeDesc,
            String busidDesc) {

        return AiReportReq.RequestOutboundInfo.builder()
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
                .reqId(request.getReqId())
                .procId(outbound.getProcId())
                .answer(outbound.getAnswer())
                .answerDt(outbound.getAnswerDt())
                .build();
    }
}
