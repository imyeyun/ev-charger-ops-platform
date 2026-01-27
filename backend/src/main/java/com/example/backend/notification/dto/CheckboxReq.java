package com.example.backend.notification.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class CheckboxReq {

    private List<String> statIds;
    private List<String> chgerIds;
}
