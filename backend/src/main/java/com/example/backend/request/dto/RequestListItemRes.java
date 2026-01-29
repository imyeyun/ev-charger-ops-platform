package com.example.backend.request.dto;

import com.example.backend.request.entity.Request;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RequestListItemRes {

    private Long reqId;
    private String title;
    private String reqType;
    private LocalDateTime reqDt;
    //private String status;
    private String field;

    public static RequestListItemRes from(Request request) {
        return RequestListItemRes.builder()
                .reqId(request.getReqId())
                .title(request.getTitle())
                .reqType(request.getReqType() != null ? request.getReqType().name() : null)
                .reqDt(request.getReqDt())
                //.status(request.getStatus() != null ? request.getStatus().name() : null)
                .field(request.getStatus() != null ? request.getStatus().name() : null)
                .build();
    }
}
