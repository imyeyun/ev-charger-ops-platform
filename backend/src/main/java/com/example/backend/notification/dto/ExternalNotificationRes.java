package com.example.backend.notification.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ExternalNotificationRes {

    private int code;
    private boolean success;
    private String message;
    private int totalCount;
    private int sentCount;
}
