package com.example.backend.requestoutbound.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

@Getter
@NoArgsConstructor
public class OutboundBatchReq {

    @NotEmpty(message = "reqIds는 최소 1개 이상 필요합니다.")
    private List<Long> reqIds;
}
