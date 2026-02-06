package com.example.backend.chargingstation.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class FastApiAnomalyRes {

    // FastAPI 응답에서 필요한 건 rows만 (나머지 as_of, threshold 등은 안 써도 됨)
    private List<Row> rows;

    @Getter
    @Setter
    public static class Row {
        private String statId;
        private String stat_nm;
    }
}
