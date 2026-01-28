package com.example.backend.chargingstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "region_code")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RegionCode {

    @Id
    @Column(name = "zcode", length = 2)
    private String zcode;

    @Column(name = "zcode_description", length = 8)
    private String zcodeDescription;
}
