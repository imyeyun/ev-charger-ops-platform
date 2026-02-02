package com.example.backend.chargingstation.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class UncheckRegionRes {

    private Map<String, RegionCount> chargingStation;

    @Getter
    @Builder
    public static class RegionCount {
        private int count;
    }
}
