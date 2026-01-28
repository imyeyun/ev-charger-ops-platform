package com.example.backend.analysis.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MultimodalAnalysisRes {

    private Boolean fireYN;
    private String fireDetails;
    private Boolean brokenYN;
    private String brokeDetails;
    private Boolean cleanYN;
    private String cleanDetails;
}

