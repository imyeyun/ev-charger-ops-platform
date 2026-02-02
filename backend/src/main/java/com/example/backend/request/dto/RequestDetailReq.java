package com.example.backend.request.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotNull; // 추가

@Getter
@NoArgsConstructor
public class RequestDetailReq {

    @NotNull(message = "reqId는 필수입니다.")
    private Long reqId;
}
