package com.example.backend.analysis.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MultimodalAnalysisRes {

    private Boolean fireYN;
    private Boolean brokenYN;
    private Boolean dirtyYN;
    private String notes; // 추가
}

