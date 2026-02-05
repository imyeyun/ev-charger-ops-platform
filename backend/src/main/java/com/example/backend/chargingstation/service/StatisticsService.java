package com.example.backend.chargingstation.service;

import com.example.backend.chargingstation.dto.*;
import com.example.backend.chargingstation.entity.Charger;
import com.example.backend.chargingstation.entity.ChargerLog;
import com.example.backend.chargingstation.entity.ChargingStation;
import com.example.backend.chargingstation.repository.ChargerLogRepository;
import com.example.backend.chargingstation.repository.ChargerRepository;
import com.example.backend.chargingstation.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatisticsService {

    private final ChargingStationRepository chargingStationRepository;
    private final ChargerRepository chargerRepository;
    private final ChargerLogRepository chargerLogRepository;

    /**
     * 충전소 검색 API
     * GET /api/search
     */
    public SearchRes search() {
        List<ChargingStation> stations = chargingStationRepository.findAllWithCodes();
        List<ChargerLog> latestLogs = chargerLogRepository.findLatestLogs();
        List<Charger> chargers = chargerRepository.findAll();

        List<SearchRes.ChargingStationInfo> stationInfos = stations.stream()
                .map(s -> SearchRes.ChargingStationInfo.builder()
                        .statId(s.getStatId())
                        .zcodeDescription(s.getRegionCode() != null ? s.getRegionCode().getZcodeDescription() : null)
                        .zscodeDescription(s.getRegionDetailCode() != null ? s.getRegionDetailCode().getZscodeDescription() : null)
                        .statNm(s.getStatNm())
                        .build())
                .collect(Collectors.toList());

        List<SearchRes.ChargerStatInfo> chargerStatInfos = latestLogs.stream()
                .map(log -> SearchRes.ChargerStatInfo.builder()
                        .chgerId(log.getChgerId())
                        .statId(log.getStatId())
                        .stat(log.getStat())
                        .build())
                .collect(Collectors.toList());

        List<SearchRes.ChargerInfo> chargerInfos = chargers.stream()
                .map(c -> SearchRes.ChargerInfo.builder()
                        .chgerId(c.getChgerId())
                        .statId(c.getStatId())
                        .chgerType(c.getChgerType())
                        .build())
                .collect(Collectors.toList());

        return SearchRes.builder()
                .chargingStation(stationInfos)
                .chargerStat(chargerStatInfos)
                .charger(chargerInfos)
                .build();
    }

    /**
     * 상태 미확인 충전소 리스트
     * GET /api/uncheckList
     */
    public UncheckListRes getUncheckList() {
        // DB에서 비정상 상태(9, 1, 4, 5)인 충전소 ID만 직접 조회 (성능 최적화)
        List<String> badCaseStatIds = chargerLogRepository.findBadCaseStatIds();
        List<ChargingStation> stations = chargingStationRepository.findAllWithCodes();

        // 충전소 정보 매핑
        Map<String, ChargingStation> stationMap = stations.stream()
                .collect(Collectors.toMap(ChargingStation::getStatId, s -> s));

        List<UncheckListRes.BadCaseStation> badCaseList = badCaseStatIds.stream()
                .map(statId -> {
                    ChargingStation station = stationMap.get(statId);
                    return UncheckListRes.BadCaseStation.builder()
                            .statId(statId)
                            .statNm(station != null ? station.getStatNm() : null)
                            .build();
                })
                .collect(Collectors.toList());

        return UncheckListRes.builder()
                .chargerBadCaseList(badCaseList)
                .build();
    }

    /**
     * 이상탐지 충전소 리스트 (조기 다운 이상탐지)
     * GET /api/anomaly
     * 현재는 비정상 상태 충전소와 동일하게 반환 (추후 AI 모델 연동 시 수정 필요)
     */
    public AnomalyRes getAnomalyList() {
        List<ChargerLog> latestLogs = chargerLogRepository.findLatestLogs();
        List<ChargingStation> stations = chargingStationRepository.findAllWithCodes();

        // 비정상 상태(9, 1, 4, 5)인 충전소 ID 추출 - DB에서 0 대신 9 사용
        Set<String> anomalyStatIds = latestLogs.stream()
                .filter(log -> log.getStat() == 9 || log.getStat() == 1 ||
                               log.getStat() == 4 || log.getStat() == 5)
                .map(ChargerLog::getStatId)
                .collect(Collectors.toSet());

        Map<String, ChargingStation> stationMap = stations.stream()
                .collect(Collectors.toMap(ChargingStation::getStatId, s -> s));

        List<AnomalyRes.AnomalyStation> anomalyList = anomalyStatIds.stream()
                .map(statId -> {
                    ChargingStation station = stationMap.get(statId);
                    return AnomalyRes.AnomalyStation.builder()
                            .statId(statId)
                            .statNm(station != null ? station.getStatNm() : null)
                            .build();
                })
                .collect(Collectors.toList());

        return AnomalyRes.builder()
                .anomalyChargerList(anomalyList)
                .build();
    }

    /**
     * 상태 미확인 충전기 현황 (상태별 개수)
     * GET /api/uncheck
     */
    public ChargerStatRes getUncheckStats() {
        List<Object[]> statCounts = chargerLogRepository.countByStatGrouped();

        Map<Integer, Long> statCountMap = new HashMap<>();
        for (Object[] row : statCounts) {
            Integer stat = (Integer) row[0];
            Long count = (Long) row[1];
            statCountMap.put(stat, count);
        }

        return ChargerStatRes.builder()
                .stat9(statCountMap.getOrDefault(9, 0L).intValue())
                .stat1(statCountMap.getOrDefault(1, 0L).intValue())
                .stat2(statCountMap.getOrDefault(2, 0L).intValue())
                .stat3(statCountMap.getOrDefault(3, 0L).intValue())
                .stat4(statCountMap.getOrDefault(4, 0L).intValue())
                .stat5(statCountMap.getOrDefault(5, 0L).intValue())
                .build();
    }

    /**
     * 지역별 상태 미확인 비율
     * GET /api/uncheckRg
     */
    public UncheckRegionRes getUncheckByRegion() {
        List<Object[]> regionCounts = chargerLogRepository.countBadCaseByRegion();

        Map<String, UncheckRegionRes.RegionCount> regionMap = new LinkedHashMap<>();

        // 서울시 구 코드 초기화 (기본값 0)
        String[] seoulZscodes = {
            "11110", "11140", "11170", "11200", "11215", "11230", "11260", "11290",
            "11305", "11320", "11350", "11380", "11410", "11440", "11470", "11500",
            "11530", "11545", "11560", "11590", "11620", "11650", "11680", "11710", "11740"
        };
        for (String zscode : seoulZscodes) {
            regionMap.put(zscode, UncheckRegionRes.RegionCount.builder().count(0).build());
        }

        // 실제 데이터로 업데이트
        for (Object[] row : regionCounts) {
            String zscode = (String) row[0];
            Long count = (Long) row[1];
            if (zscode != null) {
                regionMap.put(zscode, UncheckRegionRes.RegionCount.builder().count(count.intValue()).build());
            }
        }

        return UncheckRegionRes.builder()
                .chargingStation(regionMap)
                .build();
    }

    /**
     * 충전기 상태 현황
     * GET /api/condition
     */
    public ChargerStatRes getConditionStats() {
        // uncheck와 동일한 로직 사용
        return getUncheckStats();
    }

    /**
     * 일별 상태 미확인 충전기 개수
     * GET /api/uncheckDaily
     */
    public UncheckDailyRes getUncheckDaily() {
        List<Object[]> dailyCounts = chargerLogRepository.countBadCaseByDate();

        List<UncheckDailyRes.DailyBadCase> dailyList = dailyCounts.stream()
                .map(row -> {
                    LocalDate date = (LocalDate) row[0];
                    Long count = (Long) row[1];
                    return UncheckDailyRes.DailyBadCase.builder()
                            .date(date)
                            .sum(count.intValue())
                            .build();
                })
                .collect(Collectors.toList());

        return UncheckDailyRes.builder()
                .dailychargerStatBadCase(dailyList)
                .build();
    }
}
