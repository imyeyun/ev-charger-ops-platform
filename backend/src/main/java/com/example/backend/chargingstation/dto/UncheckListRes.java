package com.example.backend.chargingstation.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class UncheckListRes {

    private List<BadCaseStation> chargerBadCaseList;

    @Getter
    @Builder
    public static class BadCaseStation {
        private String statId;
        private String statNm;
    }
}
