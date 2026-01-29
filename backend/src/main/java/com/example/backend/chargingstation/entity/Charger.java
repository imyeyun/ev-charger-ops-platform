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

@Entity
@Table(name = "charger")
@IdClass(ChargerId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Charger {

    @Id
    @Column(name = "chger_id", length = 2)
    private String chgerId;

    @Id
    @Column(name = "stat_id", length = 8)
    private String statId;

    @Column(name = "chger_type", length = 2, nullable = false)
    private String chgerType;

    @Column(name = "output", length = 8, nullable = false)
    private String output;

    @Column(name = "method", length = 8, nullable = false)
    private String method;

    @ManyToOne
    @JoinColumns({
            @JoinColumn(name = "stat_id", referencedColumnName = "stat_id", insertable = false, updatable = false)
    })
    private ChargingStation chargingStation;
}
