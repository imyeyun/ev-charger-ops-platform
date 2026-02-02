package com.example.backend.chargingstation.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AnomalyRes {

    private List<AnomalyStation> anomalyChargerList;

    @Getter
    @Builder
    public static class AnomalyStation {
        private String statId;
        private String statNm;
    }
}
