package com.example.backend.chargingstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_log")
@IdClass(SensorLogId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SensorLog {

    @Id
    @Column(name = "sensor_time")
    private LocalDateTime sensorTime;

    @Id
    @Column(name = "chger_id", length = 2)
    private String chgerId;

    @Id
    @Column(name = "stat_id", length = 8)
    private String statId;

    @Column(name = "total_charging_kwh", nullable = false)
    private Double totalChargingKwh;

    @Column(name = "total_charging_min", nullable = false)
    private Integer totalChargingMin;

    @Column(name = "current_soc", nullable = false)
    private Integer currentSoc;

    @Column(name = "current_energy_meter_value", nullable = false)
    private Double currentEnergyMeterValue;

    @Column(name = "chargingv", nullable = false)
    private Double chargingv;

    @Column(name = "charginga", nullable = false)
    private Double charginga;

    @Column(name = "out_power", nullable = false)
    private Double outPower;

    @Column(name = "charging_gun_temperature1", nullable = false)
    private Integer chargingGunTemperature1;

    @Column(name = "charging_gun_temperature2", nullable = false)
    private Integer chargingGunTemperature2;

    @Column(name = "types", nullable = false)
    private Integer types;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "chger_id", referencedColumnName = "chger_id", insertable = false, updatable = false),
            @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false)
    })
    private Charger charger;
}