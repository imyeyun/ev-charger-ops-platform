package com.example.backend.notification.controller;

import com.example.backend.notification.dto.CheckboxReq;
import com.example.backend.notification.dto.ExternalNotificationReq;
import com.example.backend.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Notification", description = "알림 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "알림 체크박스", description = "비정상 상태 충전소 목록 조회")
    @PostMapping("/notification/checkbox")
    public ResponseEntity<List<String>> getCheckboxData(@RequestBody(required = false) CheckboxReq request) {
        List<String> badCaseStatIds = notificationService.getCheckboxData(request);
        return ResponseEntity.ok(badCaseStatIds);
    }

    @Operation(summary = "외부 알림 전송", description = "선택한 충전소에 대한 외부 알림 전송")
    @PostMapping("/external_notification")
    public ResponseEntity<Void> sendExternalNotification(@RequestBody ExternalNotificationReq request) {
        notificationService.sendExternalNotification(request);
        return ResponseEntity.ok().build();
    }
}
