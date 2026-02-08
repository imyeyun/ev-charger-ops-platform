package com.example.backend.notification.service;

import com.example.backend.ai.client.AiEmailClient;
import com.example.backend.ai.dto.email.AlertEmailReq;
import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.entity.ChargingStation;
import com.example.backend.chargingstation.repository.ChargerLogRepository;
import com.example.backend.chargingstation.repository.ChargingStationRepository;
import com.example.backend.chargingstation.util.ChargerStatusUtil;
import com.example.backend.notification.dto.ExternalNotificationReq;
import com.example.backend.notification.dto.ExternalNotificationRes;
import com.example.backend.notification.entity.ExternalNotification;
import com.example.backend.notification.repository.ExternalNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class NotificationService {

    private final ExternalNotificationRepository externalNotificationRepository;
    private final ChargerLogRepository chargerLogRepository;
    private final ChargingStationRepository chargingStationRepository;
    private final AiEmailClient aiEmailClient;

    public List<String> getCheckboxData() {
        return chargerLogRepository.findBadCaseStatIds();
    }

    @Transactional
    public ExternalNotificationRes sendExternalNotification(ExternalNotificationReq request) {
        List<String> statIds = request.getStatId();

        // 1. ChargerLog에서 상태 정보 조회 (선택된 statId별로 최신 로그만)
        List<ChargerLog> targetLogs = statIds.stream()
                .flatMap(statId -> chargerLogRepository.findLatestLogsByStatId(statId).stream())
                .toList();

        // 2. ChargingStation에서 busiCall(이메일/연락처) 조회
        List<ChargingStation> stations = chargingStationRepository.findByStatIdIn(statIds);
        Map<String, ChargingStation> stationMap = stations.stream()
                .collect(Collectors.toMap(ChargingStation::getStatId, Function.identity()));

        int totalCount = targetLogs.size();
        int sentCount = 0;

        // 3. 각 충전기별로 FastAPI 호출 + DB 저장
        for (ChargerLog chargerLog : targetLogs) {
            ChargingStation station = stationMap.get(chargerLog.getStatId());
            if (station == null) {
                log.warn("충전소 정보를 찾을 수 없습니다: {}", chargerLog.getStatId());
                continue;
            }

            try {
                // FastAPI 이메일 발송 요청
                AlertEmailReq emailReq = AlertEmailReq.builder()
                        .statId(chargerLog.getStatId())
                        .stat(chargerLog.getStat())
                        .busiCall(station.getBusiCall())
                        .statNm(station.getStatNm())
                        .build();

                aiEmailClient.sendEmail(emailReq);
                sentCount++;

                // DB에 알림 기록 저장
                String message = buildNotificationMessage(chargerLog);
                ExternalNotification notification = ExternalNotification.builder()
                        .message(message)
                        .testMail(station.getBusiCall())
                        .chgerTime(chargerLog.getChgerTime())
                        .chgerId(chargerLog.getChgerId())
                        .statId(chargerLog.getStatId())
                        .build();

                externalNotificationRepository.save(notification);

            } catch (Exception e) {
                log.error("이메일 발송 실패 - statId: {}, chgerId: {}", chargerLog.getStatId(), chargerLog.getChgerId(), e);
            }
        }

        boolean success = sentCount > 0;
        String message = success ? "이메일 발송 성공" : "이메일 발송 실패";

        return ExternalNotificationRes.builder()
                .code(success ? 200 : 500)
                .success(success)
                .message(message)
                .totalCount(totalCount)
                .sentCount(sentCount)
                .build();
    }

    private String buildNotificationMessage(ChargerLog log) {
        String statusText = ChargerStatusUtil.getStatusText(log.getStat());
        return String.format("충전소 %s의 충전기 %s가 '%s' 상태입니다. 확인이 필요합니다.",
                log.getStatId(), log.getChgerId(), statusText);
    }
}
