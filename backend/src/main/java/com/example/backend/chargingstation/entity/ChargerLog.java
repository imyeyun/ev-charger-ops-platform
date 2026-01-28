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
@Table(name = "charger_log")
@IdClass(ChargerLogId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChargerLog {

    @Id
    @Column(name = "chger_time")
    private LocalDateTime chgerTime;

    @Id
    @Column(name = "chger_id", length = 2)
    private String chgerId;

    @Id
    @Column(name = "stat_id", length = 8)
    private String statId;

    @Column(name = "last_tsdt", nullable = false)
    private LocalDateTime lastTsdt;

    @Column(name = "last_tedt", nullable = false)
    private LocalDateTime lastTedt;

    @Column(name = "stat_upd_dt", nullable = false)
    private LocalDateTime statUpdDt;

    @Column(name = "stat", nullable = false)
    private Integer stat;

    @ManyToOne
    @JoinColumns({
            @JoinColumn(name = "chger_id", referencedColumnName = "chger_id", insertable = false, updatable = false),
            @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false),
    })
    private Charger charger;
}
