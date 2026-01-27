package com.example.backend.requestoutbound.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class OutboundBatchRes {

    private int requestedCount;
    private int successCount;
    private List<OutboundResult> results;

    @Getter
    @Builder
    public static class OutboundResult {
        private Long reqId;
        private String status;
        private Long procId;
    }
}
