package com.example.backend.analysis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "charger_analysis")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChargerAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chgeranal_id")
    private Long chgeranalId;

    @Column(name = "unconf_min")
    private Integer unconfMin;

    @Builder
    public ChargerAnalysis(Integer unconfMin) {
        this.unconfMin = unconfMin;
    }
}
