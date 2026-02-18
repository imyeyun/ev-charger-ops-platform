package com.example.backend.ai.dto.report;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AiReportRes {

    @JsonProperty("s3_path")
    private String s3Path;
}
