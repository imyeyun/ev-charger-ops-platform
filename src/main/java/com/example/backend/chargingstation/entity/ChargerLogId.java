package com.example.backend.chargingstation.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ChargerLogId implements Serializable {

    private LocalDateTime chgerTime;
    private String chgerId;
    private String statId;
}
