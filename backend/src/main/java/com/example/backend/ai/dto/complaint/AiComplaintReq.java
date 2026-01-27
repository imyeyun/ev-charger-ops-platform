package com.example.backend.ai.dto.complaint;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AiComplaintReq {

    private ChargerStatusInfo chargerStatus;
    private MultimodalAnalysisInfo multimodalAnalysis;
    private RequestInfo request;

    @Getter
    @Builder
    public static class ChargerStatusInfo {
        private String statId;
        private String zcodeDescription;
        private String zscodeDescription;
        private String busidDescription;
        private String statNm;
        private String addr;
        private String busiCall;
        private Integer year;
        private String chgerId;
        private String chgerType;
        private String output;
        private String method;
        private LocalDateTime chgerTime;
        private LocalDateTime lastTsdt;
        private LocalDateTime lastTedt;
        private LocalDateTime statUpdDt;
        private Integer stat;
    }

    @Getter
    @Builder
    public static class MultimodalAnalysisInfo {
        private String statId;
        private String zcodeDescription;
        private String zscodeDescription;
        private String busidDescription;
        private String statNm;
        private String addr;
        private String busiCall;
        private Integer year;
        private String chgerId;
        private String chgerType;
        private String output;
        private String method;
        private LocalDateTime sensorTime;
        private Long multimodalId;
        private Boolean fireYn;
        private String fireDetails;
        private Boolean brokeYn;
        private String brokeDetails;
        private Boolean cleanYn;
        private String cleanDetails;
        private LocalDateTime imgsensoranalTime;
    }

    @Getter
    @Builder
    public static class RequestInfo {
        private Long reqId;
        private String title;
        private String content;
        private String reqType;
    }
}
