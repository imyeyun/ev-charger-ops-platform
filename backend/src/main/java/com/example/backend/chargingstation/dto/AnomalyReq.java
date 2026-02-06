package com.example.backend.chargingstation.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnomalyReq {
    private String db_path;
    private String as_of;
    private Double threshold;
    private Integer top_n;
    private String score_col;
}
