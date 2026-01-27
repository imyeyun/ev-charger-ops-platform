package com.example.backend.chargingstation.service;

import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.entity.ChargingStation;
import com.example.backend.chargingstation.dto.MonitoringRes;
import com.example.backend.chargingstation.repository.ChargerLogRepository;
import com.example.backend.chargingstation.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MonitoringService {

    private final ChargingStationRepository chargingStationRepository;
    private final ChargerLogRepository chargerLogRepository;

    public MonitoringRes getMonitoringData() {
        List<ChargingStation> stations = chargingStationRepository.findAllWithCodes();
        List<ChargerLog> latestLogs = chargerLogRepository.findLatestLogs();
        List<Object[]> statCounts = chargerLogRepository.countByStatGrouped();

        List<MonitoringRes.ChargingStationInfo> stationInfos = stations.stream()
                .map(this::toChargingStationInfo)
                .collect(Collectors.toList());

        Map<Integer, Long> statCountMap = new HashMap<>();
        for (Object[] row : statCounts) {
            Integer stat = (Integer) row[0];
            Long count = (Long) row[1];
            statCountMap.put(stat, count);
        }

        MonitoringRes.ChargerStatCount chargerStat = buildChargerStatCount(statCountMap);
        MonitoringRes.ChargerStatBadCase chargerStatBadCase = buildChargerStatBadCase(statCountMap);

        Set<String> badCaseStatIds = latestLogs.stream()
                .filter(log -> log.getStat() == 0 || log.getStat() == 1 ||
                               log.getStat() == 4 || log.getStat() == 5)
                .map(ChargerLog::getStatId)
                .collect(Collectors.toSet());

        List<MonitoringRes.ChargingStationInfo> badCaseList = stations.stream()
                .filter(station -> badCaseStatIds.contains(station.getStatId()))
                .map(this::toChargingStationInfo)
                .collect(Collectors.toList());

        return MonitoringRes.builder()
                .chargingStations(stationInfos)
                .chargerStat(chargerStat)
                .chargerStatBadCase(chargerStatBadCase)
                .chargerBadCaseList(badCaseList)
                .build();
    }

    private MonitoringRes.ChargingStationInfo toChargingStationInfo(ChargingStation station) {
        return MonitoringRes.ChargingStationInfo.builder()
                .statId(station.getStatId())
                .zcodeDescription(station.getRegionCode() != null ?
                        station.getRegionCode().getZcodeDescription() : null)
                .zscodeDescription(station.getRegionDetailCode() != null ?
                        station.getRegionDetailCode().getZscodeDescription() : null)
                .busidDescription(station.getAgency() != null ?
                        station.getAgency().getBusidDescription() : null)
                .statNm(station.getStatNm())
                .addr(station.getAddr())
                .lat(station.getLat())
                .lng(station.getLng())
                .build();
    }

    private MonitoringRes.ChargerStatCount buildChargerStatCount(Map<Integer, Long> statCountMap) {
        int unknown = statCountMap.getOrDefault(0, 0L).intValue();
        int commError = statCountMap.getOrDefault(1, 0L).intValue();
        int available = statCountMap.getOrDefault(2, 0L).intValue();
        int charging = statCountMap.getOrDefault(3, 0L).intValue();
        int stopped = statCountMap.getOrDefault(4, 0L).intValue();
        int maintenance = statCountMap.getOrDefault(5, 0L).intValue();

        return MonitoringRes.ChargerStatCount.builder()
                .unknown(unknown)
                .commError(commError)
                .available(available)
                .charging(charging)
                .stopped(stopped)
                .maintenance(maintenance)
                .sum(unknown + commError + available + charging + stopped + maintenance)
                .build();
    }

    private MonitoringRes.ChargerStatBadCase buildChargerStatBadCase(Map<Integer, Long> statCountMap) {
        int unknown = statCountMap.getOrDefault(0, 0L).intValue();
        int commError = statCountMap.getOrDefault(1, 0L).intValue();
        int stopped = statCountMap.getOrDefault(4, 0L).intValue();
        int maintenance = statCountMap.getOrDefault(5, 0L).intValue();

        return MonitoringRes.ChargerStatBadCase.builder()
                .unknown(unknown)
                .commError(commError)
                .stopped(stopped)
                .maintenance(maintenance)
                .sum(unknown + commError + stopped + maintenance)
                .build();
    }
}
