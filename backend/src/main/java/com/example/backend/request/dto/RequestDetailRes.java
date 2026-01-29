package com.example.backend.request.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class RequestDetailRes {

    private RequestInfo request;
    private List<OutboundInfo> outbounds;

    @Getter
    @Builder
    public static class RequestInfo {
        private Long reqId;
        private String chgerId;
        private String statId;
        private String title;
        private String content;
        private String reqType;
        private LocalDateTime reqDt;
        private String status;
    }

    @Getter
    @Builder
    public static class OutboundInfo {
        private Long procId;
        private String answer;
        private LocalDateTime answerDt;
    }
}
