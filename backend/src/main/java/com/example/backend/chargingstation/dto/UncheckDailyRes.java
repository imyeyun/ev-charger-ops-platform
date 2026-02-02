package com.example.backend.chargingstation.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class UncheckDailyRes {

    private List<DailyBadCase> dailychargerStatBadCase;

    @Getter
    @Builder
    public static class DailyBadCase {
        private LocalDate date;
        private int sum;
    }
}
