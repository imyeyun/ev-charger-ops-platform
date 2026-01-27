package com.example.backend.chargingstation.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class StationDetailRes {

    private ChargingStationDetail chargingStation;
    private List<ChargerDetail> chargers;
    private ImageDetail image;

    @Getter
    @Builder
    public static class ChargingStationDetail {
        private String zcodeDescription;
        private String zscodeDescription;
        private String busidDescription;
        private String statNm;
        private String addr;
        private Double lat;
        private Double lng;
        private String busiCall;
        private String note;
        private Integer year;
    }

    @Getter
    @Builder
    public static class ChargerDetail {
        private String chgerId;
        private String chgerType;
        private String output;
        private String method;
        private LocalDateTime chgerTime;
        private LocalDateTime lastTsdt;
        private LocalDateTime lastTedt;
        private LocalDateTime statUpdDt;
        private Integer stat;
    }

    @Getter
    @Builder
    public static class ImageDetail {
        private String imgPath;
    }
}
