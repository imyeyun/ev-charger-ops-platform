package com.example.backend.notification.service;

import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.repository.ChargerLogRepository;
import com.example.backend.chargingstation.util.ChargerStatusUtil;
import com.example.backend.notification.dto.CheckboxReq;
import com.example.backend.notification.dto.ExternalNotificationReq;
import com.example.backend.notification.entity.ExternalNotification;
import com.example.backend.notification.repository.ExternalNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final ExternalNotificationRepository externalNotificationRepository;
    private final ChargerLogRepository chargerLogRepository;

    public List<String> getCheckboxData(CheckboxReq request) {
        List<ChargerLog> latestLogs = chargerLogRepository.findLatestLogs();

        Set<String> badCaseStatIds = latestLogs.stream()
                .filter(ChargerStatusUtil::isBadCase)
                .map(ChargerLog::getStatId)
                .collect(Collectors.toSet());

        return badCaseStatIds.stream().toList();
    }

    @Transactional
    public void sendExternalNotification(ExternalNotificationReq request) {
        List<String> statIds = request.getStatId();

        List<ChargerLog> latestLogs = chargerLogRepository.findLatestLogs();
        List<ChargerLog> targetLogs = latestLogs.stream()
                .filter(log -> statIds.contains(log.getStatId()))
                .toList();

        for (ChargerLog log : targetLogs) {
            String message = buildNotificationMessage(log);

            ExternalNotification notification = ExternalNotification.builder()
                    .message(message)
                    .chgerTime(log.getChgerTime())
                    .chgerId(log.getChgerId())
                    .statId(log.getStatId())
                    .build();

            externalNotificationRepository.save(notification);
        }
    }

    private String buildNotificationMessage(ChargerLog log) {
        String statusText = ChargerStatusUtil.getStatusText(log.getStat());
        return String.format("충전소 %s의 충전기 %s가 '%s' 상태입니다. 확인이 필요합니다.",
                log.getStatId(), log.getChgerId(), statusText);
    }
}
