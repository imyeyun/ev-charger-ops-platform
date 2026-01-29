package com.example.backend.chargingstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "charging_station")
//@IdClass(ChargingStationId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChargingStation {

    @Id
    @Column(name = "stat_id", length = 8)
    private String statId;


    @Column(name = "zcode", length = 2)
    private String zcode;


    @Column(name = "zscode", length = 5)
    private String zscode;


    @Column(name = "busi_id", length = 2)
    private String busiId;

    @Column(name = "stat_nm", length = 100, nullable = false)
    private String statNm;

    @Column(name = "addr", length = 150, nullable = false)
    private String addr;

    @Column(name = "lat", nullable = false)
    private Double lat;

    @Column(name = "lng", nullable = false)
    private Double lng;

    @Column(name = "busi_call", length = 20, nullable = false)
    private String busiCall;

    @Column(name = "note", length = 200, nullable = false)
    private String note;

    @Column(name = "install_year", nullable = false)
    private Integer year;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zcode", referencedColumnName = "zcode", insertable = false, updatable = false)
    private RegionCode regionCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zscode", referencedColumnName = "zscode", insertable = false, updatable = false)
    private RegionDetailCode regionDetailCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "busi_id", referencedColumnName = "busi_id", insertable = false, updatable = false)
    private Agency agency;
}