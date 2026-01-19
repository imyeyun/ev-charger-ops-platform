package com.example.backend.ai.dto.report;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class AiReportReq {

    private String reportType;
    private String prompt;
    private LocalDateTime dataStartTime;
    private LocalDateTime dataEndTime;
    private List<ChargerStatusInfo> chargerStatus;
    private List<MultimodalAnalysisInfo> multimodalAnalysis;
    private List<OpenRequestInfo> openRequests;
    private List<RequestOutboundInfo> requestOutbounds;

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
    public static class OpenRequestInfo {
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
        private Long reqId;
        private String title;
        private String content;
        private String reqType;
        private LocalDateTime reqDt;
        private String status;
    }

    @Getter
    @Builder
    public static class RequestOutboundInfo {
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
        private Long reqId;
        private Long procId;
        private String answer;
        private LocalDateTime answerDt;
    }
}
