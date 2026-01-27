package com.example.backend.notification.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class ExternalNotificationReq {

    private List<String> statId;
}
