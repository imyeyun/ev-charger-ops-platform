package com.example.backend.ai.dto.email;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AlertEmailReq {

    @JsonProperty("stat_id")
    private String statId;

    @JsonProperty("stat")
    private Integer stat;

    @JsonProperty("busi_call")
    private String busiCall;

    @JsonProperty("stat_nm")
    private String statNm;
}
