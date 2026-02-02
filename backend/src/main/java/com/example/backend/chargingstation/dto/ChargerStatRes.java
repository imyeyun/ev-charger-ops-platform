package com.example.backend.chargingstation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChargerStatRes {

    @JsonProperty("0")
    private int stat0;  // 알수없음

    @JsonProperty("1")
    private int stat1;  // 통신이상

    @JsonProperty("2")
    private int stat2;  // 사용가능

    @JsonProperty("3")
    private int stat3;  // 충전중

    @JsonProperty("4")
    private int stat4;  // 운영중지

    @JsonProperty("5")
    private int stat5;  // 점검중
}
