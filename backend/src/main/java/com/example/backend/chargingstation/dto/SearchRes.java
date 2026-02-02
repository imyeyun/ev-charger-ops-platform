package com.example.backend.chargingstation.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SearchRes {

    private List<ChargingStationInfo> chargingStation;
    private List<ChargerStatInfo> chargerStat;
    private List<ChargerInfo> charger;

    @Getter
    @Builder
    public static class ChargingStationInfo {
        private String statId;
        private String zcodeDescription;
        private String zscodeDescription;
        private String statNm;
    }

    @Getter
    @Builder
    public static class ChargerStatInfo {
        private String chgerId;
        private String statId;
        private Integer stat;
    }

    @Getter
    @Builder
    public static class ChargerInfo {
        private String chgerId;
        private String statId;
        private String chgerType;
    }
}
