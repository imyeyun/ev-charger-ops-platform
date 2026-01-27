package com.example.backend.chargingstation.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class MonitoringRes {

    private List<ChargingStationInfo> chargingStations;
    private ChargerStatCount chargerStat;
    private ChargerStatBadCase chargerStatBadCase;
    private List<ChargingStationInfo> chargerBadCaseList;

    @Getter
    @Builder
    public static class ChargingStationInfo {
        private String statId;
        private String zcodeDescription;
        private String zscodeDescription;
        private String busidDescription;
        private String statNm;
        private String addr;
        private Double lat;
        private Double lng;
    }

    @Getter
    @Builder
    public static class ChargerStatCount {
        private int unknown;      // 0: 알수없음
        private int commError;    // 1: 통신이상
        private int available;    // 2: 사용가능
        private int charging;     // 3: 충전중
        private int stopped;      // 4: 운영중지
        private int maintenance;  // 5: 점검중
        private int sum;
    }

    @Getter
    @Builder
    public static class ChargerStatBadCase {
        private int unknown;      // 0: 알수없음
        private int commError;    // 1: 통신이상
        private int stopped;      // 4: 운영중지
        private int maintenance;  // 5: 점검중
        private int sum;
    }
}
