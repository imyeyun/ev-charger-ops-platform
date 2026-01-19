package com.example.backend.chargingstation.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ChargingStationId implements Serializable {

    private String statId;
    private String zcode;
    private String zscode;
    private String busiId;
}